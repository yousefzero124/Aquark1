// =========================================================
// API الحسابات — نفس الكود بيشتغل على جهازك وعلى Vercel
//
//  POST   /api/auth/register      إنشاء حساب
//  POST   /api/auth/login         تسجيل دخول
//  POST   /api/auth/logout        تسجيل خروج
//  GET    /api/auth/me            مين مسجل دخول دلوقتي
//  POST   /api/auth/forgot        طلب كود استرجاع كلمة المرور
//  POST   /api/auth/reset         تغيير كلمة المرور بالكود
//  POST   /api/auth/google        الدخول بـ Google (لو متفعّل)
//  PATCH  /api/me                 تعديل البيانات / التفضيلات
//  POST   /api/me/password        تغيير كلمة المرور
//  DELETE /api/me                 حذف الحساب
//  GET    /api/admin/users        (أدمن) كل الحسابات
//  PATCH  /api/admin/users/:id    (أدمن) تغيير نوع الحساب
//  DELETE /api/admin/users/:id    (أدمن) حذف حساب
//
// الأخطاء بترجع كـ { error: "err_..." } — نفس مفاتيح الترجمة اللي في الموقع.
// =========================================================
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { getStore, databaseUrl, DATA_DIR } = require("./store");
const security = require("./security");
const { clientIp } = security;

const IS_VERCEL = !!process.env.VERCEL;
const ROLES = ["buyer", "investor", "broker", "admin"];
const GENDERS = ["male", "female"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MOBILE_RE = /^(?:\+?20)?0?1[0125]\d{8}$/;
const SESSION_DAYS = 30;
const COOKIE = "aqarak_sid";

/* ---------- أخطاء ---------- */
class ApiError extends Error {
  constructor(status, key) { super(key); this.status = status; }
}
const fail = (status, key) => { throw new ApiError(status, key); };

/* ---------- الإعدادات (متغيرات البيئة) ---------- */
// سر توقيع الجلسات: على Vercel لازم SESSION_SECRET، وعلى جهازك بيتعمل لوحده في data/secret.key
let localSecret = null;
function sessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (IS_VERCEL) fail(500, "err_not_configured");
  if (!localSecret) {
    const file = path.join(DATA_DIR, "secret.key");
    try { localSecret = fs.readFileSync(file, "utf8").trim(); } catch (e) { /* أول مرة */ }
    if (!localSecret) {
      localSecret = crypto.randomBytes(32).toString("hex");
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(file, localSecret);
    }
  }
  return localSecret;
}
// الطلب جاي من الجهاز نفسه فعلاً؟ (مش من "Share Online" أو أي بروكسي) — المميزات التجريبية بتشتغل هنا بس
function isLocalRequest(req) {
  if (IS_VERCEL || process.env.AQARAK_PUBLIC === "1") return false;
  const h = req.headers || {};
  if (h["x-forwarded-for"] || h["x-forwarded-host"] || h["cf-connecting-ip"] || h["x-real-ip"] || h["forwarded"]) return false;
  const ip = String((req.socket && req.socket.remoteAddress) || "");
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}
// كود الأدمن: على Vercel من ADMIN_CODE (لازم 12 حرف على الأقل عشان ميتخمّنش)، وعلى جهازك 2005 لو مش متحدد
const ADMIN_CODE_MIN = 12;
function adminCode(req) {
  const env = String(process.env.ADMIN_CODE || "").trim();
  if (env) return IS_VERCEL && env.length < ADMIN_CODE_MIN ? "" : env;
  return req && isLocalRequest(req) ? "2005" : "";
}

/* ---------- كلمات المرور (scrypt) ---------- */
function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) return reject(err);
      resolve(`scrypt$${salt.toString("hex")}$${key.toString("hex")}`);
    });
  });
}
function verifyPassword(password, stored) {
  return new Promise((resolve) => {
    const [algo, saltHex, keyHex] = String(stored || "").split("$");
    if (algo !== "scrypt" || !saltHex || !keyHex) return resolve(false);
    crypto.scrypt(String(password), Buffer.from(saltHex, "hex"), 64, (err, key) => {
      if (err) return resolve(false);
      const expected = Buffer.from(keyHex, "hex");
      resolve(expected.length === key.length && crypto.timingSafeEqual(expected, key));
    });
  });
}
// هاش ثابت بيستخدم لما الإيميل مش موجود — عشان وقت الرد يبقى نفسه
let dummyHash = null;
async function burnTime(password) {
  if (!dummyHash) dummyHash = await hashPassword("aqarak-dummy-password");
  await verifyPassword(password, dummyHash);
}

/* ---------- الجلسات (كوكي موقّعة) ---------- */
const b64url = (buf) => Buffer.from(buf).toString("base64url");
const sign = (data) => b64url(crypto.createHmac("sha256", sessionSecret()).update(data).digest());
// بصمة كلمة المرور: لما الباسورد يتغيّر، كل الجلسات القديمة تبطل
const passMark = (user) => crypto.createHash("sha256").update(`${user.id}:${user.pass_hash || "none"}`).digest("hex").slice(0, 12);

function makeToken(user) {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  const body = b64url(JSON.stringify({ uid: user.id, exp, pm: passMark(user) }));
  return `${body}.${sign(body)}`;
}
function readToken(token) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return data.exp > Date.now() ? data : null;
  } catch (e) { return null; }
}
function isHttps(req) {
  return IS_VERCEL || req.headers["x-forwarded-proto"] === "https" || !!(req.socket && req.socket.encrypted);
}
function setSession(req, res, user) {
  const parts = [`${COOKIE}=${makeToken(user)}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${SESSION_DAYS * 86400}`];
  if (isHttps(req)) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}
function clearSession(req, res) {
  const parts = [`${COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (isHttps(req)) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}
function readCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}
async function currentUser(req, store) {
  const data = readToken(readCookie(req, COOKIE));
  if (!data) return null;
  const user = await store.getUserById(data.uid);
  if (!user || passMark(user) !== data.pm) return null;
  return user;
}
async function requireUser(req, store) {
  const user = await currentUser(req, store);
  if (!user) fail(401, "err_session");
  return user;
}

/* ---------- حماية من التخمين والسبام (محاولات كتير ورا بعض) ----------
   العدّاد محفوظ في قاعدة البيانات، فبيشتغل حتى لو Vercel شغّل كذا نسخة من السيرفر.
   وفيه نسخة في الذاكرة كمان عشان نرفض بسرعة من غير ما نسأل قاعدة البيانات. */
const attempts = new Map();
async function limit(key, max, windowMs) {
  const now = Date.now();
  const rec = attempts.get(key);
  if (rec && rec.reset > now && rec.n >= max) fail(429, "err_too_many"); // معروف إنه زاد — من غير قاعدة بيانات
  let n;
  try {
    n = await (await getStore()).hit(key, windowMs);
  } catch (e) {
    // قاعدة البيانات مش متاحة → نكمّل بالعدّاد اللي في الذاكرة
    n = rec && rec.reset > now ? rec.n + 1 : 1;
  }
  attempts.set(key, { n, reset: rec && rec.reset > now ? rec.reset : now + windowMs });
  if (attempts.size > 5000) for (const [k, v] of attempts) if (v.reset < now) attempts.delete(k);
  if (n > max) fail(429, "err_too_many");
}
async function clearLimit(key) {
  attempts.delete(key);
  try { await (await getStore()).clearHits(key); } catch (e) { /* مش مشكلة */ }
}

/* ---------- شكل المستخدم اللي بيرجع للموقع (من غير الباسورد) ---------- */
function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    provider: u.provider,
    picture: u.picture || "",
    phone: u.phone || "",
    age: u.age == null ? null : Number(u.age),
    gender: u.gender || "",
    city: u.city || "",
    address: u.address || "",
    prefs: u.prefs || null,
    hasPassword: !!u.pass_hash,
    createdAt: u.created_at,
  };
}

/* ---------- التحقق من البيانات ---------- */
const str = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const normEmail = (v) => str(v, 254).toLowerCase();
const normMobile = (v) => String(v || "").replace(/[\s-]/g, "");

// 8 حروف على الأقل، فيها حرف ورقم، ومش من الباسوردات المشهورة (server/security.js)
function checkPassword(p) {
  const problem = security.passwordProblem(p);
  if (problem) fail(400, problem);
}
// البيانات الشخصية — partial=true في التعديل (الحقل اللي مش مبعوت مش بيتغيّر)
function cleanProfile(body, partial) {
  const out = {};
  const has = (k) => !partial || k in body;
  if (has("name")) {
    const name = str(body.name, 80);
    if (name.length < 2) fail(400, "err_name");
    out.name = name;
  }
  if (has("phone")) {
    const phone = normMobile(body.phone);
    if (!MOBILE_RE.test(phone)) fail(400, "err_mobile");
    out.phone = phone;
  }
  if (has("age")) {
    const age = Number(body.age);
    if (!Number.isInteger(age) || age < 18 || age > 100) fail(400, "err_age");
    out.age = age;
  }
  if (has("gender")) {
    if (!GENDERS.includes(body.gender)) fail(400, "err_gender");
    out.gender = body.gender;
  }
  if (has("city")) {
    const city = str(body.city, 40);
    if (!/^[a-z0-9_-]+$/i.test(city)) fail(400, "err_city");
    out.city = city;
  }
  if (has("address")) {
    const address = str(body.address, 300);
    if (address.length < 3) fail(400, "err_address");
    out.address = address;
  }
  return out;
}
// التفضيلات: بنحتفظ بالحقول المعروفة بس وبالشكل الصح (أي حاجة تانية بتتشال)
const PREF_TYPES = ["apartment", "villa", "duplex", "chalet", "office", "land"];
const PREF_CITIES = ["east", "arab", "manakh", "zohour", "dawahy", "south", "west", "portfouad"];
function cleanPrefs(prefs) {
  if (prefs === null) return null;
  if (typeof prefs !== "object" || Array.isArray(prefs)) fail(400, "err_generic");
  const list = (v, allowed) => (Array.isArray(v) ? [...new Set(v.filter((x) => allowed.includes(x)))] : []);
  const num = (v, max) => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n) : null;
  };
  return {
    purpose: ["buy", "rent", "both"].includes(prefs.purpose) ? prefs.purpose : "both",
    types: list(prefs.types, PREF_TYPES),
    cities: list(prefs.cities, PREF_CITIES),
    budgetMin: num(prefs.budgetMin, 1e10),
    budgetMax: num(prefs.budgetMax, 1e10),
    beds: num(prefs.beds, 20),
    updatedAt: new Date().toISOString(),
  };
}
// الصورة الشخصية: لينك https (زي صورة Google) أو صورة صغيرة متصغّرة من الموقع (data:image)
function cleanPicture(v) {
  if (typeof v !== "string" || !v) return "";
  if (/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(v)) {
    if (v.length > 200 * 1024) fail(400, "err_image_big");
    return v;
  }
  const p = v.trim().slice(0, 500);
  return /^https:\/\/[^\s"'<>]+$/i.test(p) ? p : "";
}
function codesMatch(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
const newId = () => `u_${Date.now().toString(36)}${crypto.randomBytes(5).toString("hex")}`;
const sha = (v) => crypto.createHash("sha256").update(String(v)).digest("hex");

/* ---------- الدخول بـ Google (اختياري) ---------- */
async function verifyGoogle(credential) {
  const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  if (!clientId) fail(400, "google_not_configured");
  if (typeof credential !== "string" || credential.length > 4096) fail(400, "err_google");
  let info;
  try {
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!r.ok) fail(400, "err_google");
    info = await r.json();
  } catch (e) {
    if (e instanceof ApiError) throw e;
    fail(502, "err_google");
  }
  const okIssuer = info.iss === "accounts.google.com" || info.iss === "https://accounts.google.com";
  if (info.aud !== clientId || !okIssuer || String(info.email_verified) !== "true" || !info.email) fail(400, "err_google");
  return { sub: info.sub, email: String(info.email).toLowerCase(), name: info.name || "", given_name: info.given_name || "", picture: info.picture || "" };
}

/* ---------- إرسال الإيميل (اختياري: Resend) ---------- */
async function sendResetEmail(email, code) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "عقارك — كود استرجاع كلمة المرور / Password reset code",
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px">
        <p>كود استرجاع كلمة المرور بتاعك في <b>عقارك</b>:</p>
        <p style="font-size:30px;font-weight:bold;letter-spacing:6px">${code}</p>
        <p>الكود صالح لمدة 15 دقيقة. لو انت مش اللي طلبته، تجاهل الرسالة دي.</p>
        <hr><p dir="ltr">Your Aqarak password reset code is <b>${code}</b> (valid for 15 minutes).</p></div>`,
    }),
  });
  if (!r.ok) fail(502, "err_email_send");
  return true;
}

/* =========================================================
   الـ Routes
   ========================================================= */
const routes = {
  /* ----- تسجيل ----- */
  async "POST /api/auth/register"({ req, res, body, store }) {
    await limit(`reg:${clientIp(req)}`, 20, 60 * 60 * 1000);
    const role = body.role;
    if (!ROLES.includes(role)) fail(400, "err_role");
    if (role === "admin") {
      await limit(`admin:${clientIp(req)}`, 10, 60 * 60 * 1000);
      const expected = adminCode(req);
      if (!expected || !codesMatch(str(body.adminCode, 50), expected)) fail(403, "err_admin_code");
    }

    let email;
    let passHash = null;
    let google = null;
    if (body.googleCredential) {
      google = await verifyGoogle(body.googleCredential);
      email = google.email;
    } else {
      email = normEmail(body.email);
      if (!EMAIL_RE.test(email)) fail(400, "err_email");
      checkPassword(body.password);
      // إيميل مؤقت أو دومين مش موجود → مرفوض
      const problem = await security.emailProblem(email);
      if (problem) fail(400, problem);
      passHash = await hashPassword(body.password);
    }
    const profile = cleanProfile(body, false);
    if (await store.getUserByEmail(email)) fail(409, "err_exists");

    const user = await store.createUser({
      id: newId(),
      email,
      role,
      provider: google ? "google" : "password",
      picture: google ? cleanPicture(google.picture) : "",
      prefs: null,
      pass_hash: passHash,
      google_sub: google ? google.sub : null,
      ...profile,
    });
    await hooks.onRegister(store, user);
    setSession(req, res, user);
    return { status: 201, data: { user: publicUser(user) } };
  },

  /* ----- دخول ----- */
  async "POST /api/auth/login"({ req, res, body, store }) {
    const email = normEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    await limit(`login:${clientIp(req)}`, 30, 15 * 60 * 1000);
    await limit(`login:${email}`, 10, 15 * 60 * 1000);
    if (!EMAIL_RE.test(email) || !password) fail(400, "err_login");
    const user = await store.getUserByEmail(email);
    if (!user) { await burnTime(password); fail(401, "err_login"); }
    if (!user.pass_hash) fail(400, "err_google_only");
    if (!(await verifyPassword(password, user.pass_hash))) fail(401, "err_login");
    await clearLimit(`login:${email}`);
    setSession(req, res, user);
    return { user: publicUser(user) };
  },

  async "POST /api/auth/logout"({ req, res }) {
    clearSession(req, res);
    return { ok: true };
  },

  async "GET /api/auth/me"({ req, res, store }) {
    const user = await currentUser(req, store);
    if (!user && readCookie(req, COOKIE)) clearSession(req, res);
    return { user: user ? publicUser(user) : null };
  },

  /* ----- نسيت كلمة المرور ----- */
  async "POST /api/auth/forgot"({ req, body, store }) {
    const email = normEmail(body.email);
    if (!EMAIL_RE.test(email)) fail(400, "err_email");
    await limit(`forgot:${clientIp(req)}`, 10, 60 * 60 * 1000);
    await limit(`forgot:${email}`, 3, 15 * 60 * 1000);
    const emailReady = !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
    // على جهازك من غير إيميل: الكود بيظهر على الشاشة (للتجربة بس)
    const demo = !emailReady && isLocalRequest(req);
    if (!emailReady && !demo) fail(503, "err_reset_unavailable");

    const user = await store.getUserByEmail(email);
    if (!user) {
      if (demo) fail(404, "err_no_user");
      return { ok: true }; // على الموقع الحقيقي مش بنقول الإيميل موجود ولا لأ
    }
    const code = String(crypto.randomInt(100000, 1000000));
    await store.saveReset(email, sha(`${email}:${code}`), new Date(Date.now() + 15 * 60 * 1000).toISOString());
    if (demo) return { ok: true, demoCode: code };
    await sendResetEmail(email, code);
    return { ok: true };
  },

  async "POST /api/auth/reset"({ req, body, store }) {
    const email = normEmail(body.email);
    const code = str(body.code, 10);
    await limit(`reset:${clientIp(req)}`, 20, 60 * 60 * 1000);
    await limit(`reset-mail:${email}`, 8, 60 * 60 * 1000); // تخمين الكود: 8 محاولات في الساعة بس لكل إيميل (من أي جهاز)
    const r = await store.getReset(email);
    if (!r || new Date(r.expires_at).getTime() < Date.now() || r.attempts >= 5) {
      if (r) await store.deleteReset(email);
      fail(400, "err_code");
    }
    if (!codesMatch(sha(`${email}:${code}`), r.code_hash)) {
      await store.bumpResetAttempts(email);
      fail(400, "err_code");
    }
    checkPassword(body.password);
    const user = await store.getUserByEmail(email);
    if (!user) fail(400, "err_code");
    await store.updateUser(user.id, { pass_hash: await hashPassword(body.password) });
    await store.deleteReset(email);
    await hooks.onPassword(store, user);
    return { ok: true };
  },

  /* ----- Google ----- */
  async "POST /api/auth/google"({ req, res, body, store }) {
    await limit(`google:${clientIp(req)}`, 30, 15 * 60 * 1000);
    const g = await verifyGoogle(body.credential);
    let user = (await store.getUserByGoogleSub(g.sub)) || (await store.getUserByEmail(g.email));
    if (!user) {
      // حساب جديد → الموقع يكمّل خطوات التسجيل
      return { needsSignup: true, profile: { email: g.email, name: g.name, given_name: g.given_name, picture: g.picture } };
    }
    const patch = {};
    if (!user.google_sub) {
      patch.google_sub = g.sub;
      // أول ربط بـ Google لحساب اتعمل بباسورد: الباسورد القديم بيتشال وكل جلساته بتقفل
      // (عشان لو حد عمل حساب بإيميلك قبلك، ميفضلش معاه دخول بعد ما تربطه انت بـ Google)
      if (user.pass_hash) patch.pass_hash = null;
    }
    if (!user.picture && g.picture) patch.picture = cleanPicture(g.picture);
    if (Object.keys(patch).length) user = await store.updateUser(user.id, patch);
    setSession(req, res, user);
    return { user: publicUser(user) };
  },

  /* ----- حسابي ----- */
  async "PATCH /api/me"({ req, body, store }) {
    const user = await requireUser(req, store);
    const patch = cleanProfile(body, true);
    if ("prefs" in body) patch.prefs = cleanPrefs(body.prefs);
    if ("picture" in body) patch.picture = cleanPicture(body.picture);
    // المستخدم يقدر يبدّل بين مشتري / مستثمر / بروكر بس (الأدمن بيتعمل بالكود أو من لوحة التحكم)
    if ("role" in body && body.role !== user.role) {
      if (user.role === "admin" || !["buyer", "investor", "broker"].includes(body.role)) fail(403, "err_role");
      patch.role = body.role;
    }
    const updated = await store.updateUser(user.id, patch);
    if (patch.prefs) await hooks.onPrefs(store, user.id); // تذكير "حدد تفضيلاتك" يتشال
    if (patch.name && patch.name !== user.name) await hooks.onName(store, user.id, patch.name);
    return { user: publicUser(updated) };
  },

  async "POST /api/me/password"({ req, res, body, store }) {
    const user = await requireUser(req, store);
    await limit(`pw:${user.id}`, 10, 15 * 60 * 1000);
    if (user.pass_hash && !(await verifyPassword(String(body.current || ""), user.pass_hash))) fail(400, "err_current_password");
    checkPassword(body.password);
    const updated = await store.updateUser(user.id, { pass_hash: await hashPassword(body.password) });
    await hooks.onPassword(store, updated);
    setSession(req, res, updated); // الجلسة دي تفضل شغالة، والباقي يبطل
    return { user: publicUser(updated) };
  },

  async "DELETE /api/me"({ req, res, store }) {
    const user = await requireUser(req, store);
    await hooks.purgeUser(store, user.id);
    await store.deleteUser(user.id);
    clearSession(req, res);
    return { ok: true };
  },

  /* ----- الأدمن ----- */
  async "GET /api/admin/users"({ req, store }) {
    const me = await requireUser(req, store);
    if (me.role !== "admin") fail(403, "err_forbidden");
    return { users: (await store.listUsers()).map(publicUser) };
  },

  async "PATCH /api/admin/users/:id"({ req, body, store, params }) {
    const me = await requireUser(req, store);
    if (me.role !== "admin") fail(403, "err_forbidden");
    if (!ROLES.includes(body.role)) fail(400, "err_role");
    if (params.id === me.id && body.role !== "admin") fail(400, "err_self");
    const before = await store.getUserById(params.id);
    if (!before) fail(404, "err_no_user");
    const updated = await store.updateUser(params.id, { role: body.role });
    if (before.role !== body.role) await hooks.onRole(store, params.id, body.role);
    return { user: publicUser(updated) };
  },

  async "DELETE /api/admin/users/:id"({ req, store, params }) {
    const me = await requireUser(req, store);
    if (me.role !== "admin") fail(403, "err_forbidden");
    if (params.id === me.id) fail(400, "err_self");
    await hooks.purgeUser(store, params.id);
    await store.deleteUser(params.id);
    return { ok: true };
  },
};

// الإعلانات والمفضلة والإشعارات والمحادثات والبحث المحفوظ (server/features.js)
const { routes: featureRoutes, hooks } = require("./features")({ fail, requireUser, str, limit });
Object.assign(routes, featureRoutes);

// بيلاقي الـ route المناسب (بما فيها اللي فيها :id)
function match(method, pathname) {
  const clean = pathname.replace(/\/+$/, "");
  for (const key of Object.keys(routes)) {
    const [m, pattern] = key.split(" ");
    if (m !== method) continue;
    const a = pattern.split("/");
    const b = clean.split("/");
    if (a.length !== b.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < a.length; i++) {
      if (a[i].startsWith(":")) {
        try { params[a[i].slice(1)] = decodeURIComponent(b[i]); } catch (e) { ok = false; break; }
      } else if (a[i] !== b[i]) { ok = false; break; }
    }
    if (ok) return { fn: routes[key], params };
  }
  return null;
}

function readBody(req) {
  // Vercel ساعات بيكون قرا الـ body بالفعل
  if (req.body !== undefined) {
    if (typeof req.body === "object" && req.body !== null && !Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
    try { return Promise.resolve(JSON.parse(String(req.body || "{}"))); } catch (e) { return Promise.reject(new ApiError(400, "err_generic")); }
  }
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      // 4.5 MB (حد Vercel) — عشان صور الإعلان وصورة الـ 360
      if (size > 4.5 * 1024 * 1024) { reject(new ApiError(413, "err_image_big")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch (e) { reject(new ApiError(400, "err_generic")); }
    });
    req.on("error", reject);
  });
}

function send(res, status, data) {
  if (res.headersSent) return;
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(data));
}

// فحص الإعدادات: افتح /api/health — بيقول كل إعداد موجود ولا لأ (من غير ما يعرض أي قيمة سرية)
async function health(res) {
  let database = "missing";
  if (databaseUrl() || !IS_VERCEL) {
    try { await getStore(); database = "ok"; } catch (e) { database = "error"; }
  }
  const secret = process.env.SESSION_SECRET || "";
  send(res, 200, {
    database,
    sessionSecret: IS_VERCEL ? (secret.length >= 32 ? "ok" : secret ? "too_short" : "missing") : "ok (local)",
    adminCode: process.env.ADMIN_CODE ? (adminCode() ? "ok" : `too_short (min ${ADMIN_CODE_MIN})`) : (IS_VERCEL ? "missing" : "ok (local 2005)"),
    resetEmail: process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? "ok" : "off",
    videoUpload: { blob: "ok", local: "ok (local)", off: "off (needs Vercel Blob)" }[require("./video").mode()],
    google: process.env.GOOGLE_CLIENT_ID ? "ok" : "off",
  });
}

async function handleApi(req, res, pathname) {
  try {
    const method = req.method || "GET";
    if (method === "GET" && pathname.replace(/\/+$/, "") === "/api/health") return await health(res);
    // طلبات كتير جداً من نفس الجهاز (سبام / flood)
    if (!security.floodCheck(clientIp(req))) fail(429, "err_too_many");
    const found = match(method, pathname);
    if (!found) fail(404, "err_not_found");
    // أي طلب بيغيّر حاجة لازم يكون جاي من الموقع نفسه
    if (method !== "GET" && method !== "HEAD" && (!security.sameOrigin(req) || req.headers["sec-fetch-site"] === "cross-site")) fail(403, "err_forbidden");
    let body = {};
    const rawUpload = method === "POST" && pathname.replace(/\/+$/, "") === "/api/uploads/video"; // ملف فيديو مش JSON
    if (rawUpload) {
      if (!/^video\//i.test(String(req.headers["content-type"] || ""))) fail(415, "err_video_type");
    } else if (method !== "GET" && method !== "HEAD") {
      // بس JSON — ده كمان بيمنع أي موقع تاني إنه يبعت طلبات باسم المستخدم (CSRF)
      const type = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
      if (type !== "application/json") fail(415, "err_generic");
      body = await readBody(req);
      if (!body || typeof body !== "object" || Array.isArray(body)) fail(400, "err_generic");
    }
    const store = await getStore();
    const query = new URL(req.url || "/", "http://localhost").searchParams;
    const out = await found.fn({ req, res, body, store, params: found.params, query });
    if (out && out.handled) return; // الـ route رد بنفسه (زي الفيديو)
    // ملفات (صور الإعلانات)
    if (out && out.raw) {
      res.statusCode = 200;
      res.setHeader("Content-Type", out.type || "application/octet-stream");
      res.setHeader("Cache-Control", out.cache || "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.end(out.raw);
    }
    if (out && out.status && out.data) return send(res, out.status, out.data);
    return send(res, 200, out || { ok: true });
  } catch (err) {
    if (err instanceof ApiError || (err && err.status && /^err_|_not_configured$/.test(err.message))) {
      return send(res, err.status, { error: err.message });
    }
    console.error("[api]", err);
    return send(res, 500, { error: "err_server" });
  }
}

module.exports = { handleApi };
