/* =========================================================
   الكود المشترك بين كل الصفحات:
   الأيقونات، التخزين، الحسابات، الإعلانات، المفضلة،
   الهيدر والفوتر، الرسائل (toast)، النوافذ (modal)،
   وكارت العقار ونافذة تفاصيله.
   ========================================================= */

/* ---------- Icons ----------
   أيقونات الموقع من مكتبة Lucide (خطوط نضيفة وبسيطة): https://lucide.dev/icons
   عشان تغيّر أيقونة: غيّر اسمها هنا بس (مثلاً LI("house") → LI("house-plus")).
   شعارات السوشيال ميديا (واتساب، فيسبوك...) من Font Awesome Brands لأن Lucide مفيهاش شعارات.
   زرار Google بيفضل بالشعار الملوّن الرسمي (شروط Google). */
const LI = (name) => `<i class="ic icon-${name}" aria-hidden="true"></i>`;   // Lucide
const FA = (cls) => `<i class="ic ${cls}" aria-hidden="true"></i>`;         // Font Awesome (للشعارات بس)
const ICONS = {
  house: LI("house"),
  building: LI("building-2"),
  apartment: LI("building-2"),
  villa: LI("house"),
  duplex: LI("layers-2"),
  chalet: LI("tree-palm"),
  office: LI("briefcase-business"),
  land: LI("land-plot"),
  pin: LI("map-pin"),
  bed: LI("bed-double"),
  bath: LI("bath"),
  area: LI("scan"),
  heart: LI("heart"),
  globe: LI("globe"),
  menu: LI("menu"),
  close: LI("x"),
  search: LI("search"),
  filter: LI("sliders-horizontal"),
  phone: LI("phone"),
  chat: FA("fa-brands fa-whatsapp"),
  user: LI("user"),
  tag: LI("tag"),
  key: LI("key-round"),
  chart: LI("trending-up"),
  shield: LI("shield-check"),
  bolt: LI("zap"),
  star: LI("star"),
  upload: LI("cloud-upload"),
  plus: LI("plus"),
  logout: LI("log-out"),
  list: LI("layout-grid"),
  lock: LI("lock"),
  eye: LI("eye"),
  eyeOff: LI("eye-off"),
  gear: LI("settings"),
  sliders: LI("sliders-horizontal"),
  admin: LI("user-cog"),
  check: LI("check"),
  wallet: LI("wallet"),
  map: LI("map"),
  pen: LI("pen-line"),
  eraser: LI("eraser"),
  crosshairs: LI("locate-fixed"),
  external: LI("external-link"),
  envelope: LI("mail"),
  bell: LI("bell"),
  bellRing: LI("bell-ring"),
  bellOff: LI("bell-off"),
  verified: LI("badge-check"),
  priceDown: LI("trending-down"),
  message: LI("message-circle"),
  send: LI("send-horizontal"),
  pano: LI("rotate-3d"),
  bellPlus: LI("bell-plus"),
  history: LI("chart-line"),
  back: LI("arrow-right"),
  edit: LI("pencil"),
  trash: LI("trash-2"),
  circle: LI("circle"),
  success: LI("circle-check"),
  error: LI("circle-alert"),
  info: LI("info"),
  // شعارات (Brands)
  whatsapp: FA("fa-brands fa-whatsapp"),
  facebook: FA("fa-brands fa-facebook-f"),
  instagram: FA("fa-brands fa-instagram"),
  xTwitter: FA("fa-brands fa-x-twitter"),
  tiktok: FA("fa-brands fa-tiktok"),
  youtube: FA("fa-brands fa-youtube"),
  google: '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>',
};
/** إيد بتسلّم جنب عناوين الترحيب (بدل الإيموجي) */
function waveIcon() { return `<span class="wave-ico" aria-hidden="true">${LI("hand")}</span>`; }

/** أيقونة بستايل إضافي: icon("lock", "font-size:30px") */
function icon(name, style = "") {
  return style ? ICONS[name].replace("<i ", `<i style="${style}" `) : ICONS[name];
}
const TYPE_ICON = { apartment: "apartment", villa: "villa", duplex: "duplex", chalet: "chalet", office: "office", land: "land" };

/* ---------- Helpers ---------- */
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtNum(n) { return Number(n || 0).toLocaleString("en-US"); }
function fmtPrice(n) { return `${fmtNum(n)} ${t("currency")}`; }
// اسم الحي (أو "خارج بورسعيد" لعنوان المستخدم)
function cityName(key) { return USER_AREAS[key] ? loc(USER_AREAS[key]) : key || "—"; }
function typeName(key) { return TYPES[key] ? loc(TYPES[key]) : key; }
function roleName(role) { return t(`role_${role}`); }
function uid(prefix = "id") { return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`; }
function safeNext(next) {
  // يمنع التحويل لمواقع خارجية بعد تسجيل الدخول
  if (!next || /^(?:[a-z]+:)?\/\//i.test(next) || next.includes(":")) return "index.html";
  return next;
}
function imgFail(el) {
  const div = document.createElement("div");
  div.className = "img-fallback";
  div.innerHTML = ICONS.house;
  el.replaceWith(div);
}

/* ---------- Storage ---------- */
const Store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }, // ممكن يرمي خطأ لو المساحة خلصت
  remove(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } },
};

/* ---------- السيرفر (API) ----------
   كل طلب بيرجع JSON. لو فيه خطأ بيرمي Error رسالته مفتاح ترجمة (err_...). */
const Api = {
  async call(method, path, body) {
    const opts = { method, credentials: "same-origin", headers: {} };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    let res;
    try { res = await fetch(path, opts); } catch (e) { throw new Error("err_network"); }
    let data = {};
    try { data = await res.json(); } catch (e) { /* مش JSON */ }
    if (!res.ok) {
      if (res.status === 401 && data.error === "err_session") Auth.forget();
      throw new Error(data.error || (res.status === 404 ? "err_no_server" : "err_server"));
    }
    return data;
  },
};

/* ---------- Accounts ----------
   الحسابات محفوظة على السيرفر (قاعدة البيانات). الجلسة كوكي httpOnly
   والمتصفح بيحتفظ بنسخة من بيانات المستخدم (aqarak_me) عشان الصفحات تفتح بسرعة،
   وبتتحدّث من السيرفر مع كل فتحة صفحة (Auth.refresh). */
const Auth = {
  ROLES: ["buyer", "investor", "broker", "admin"],
  current() { return Store.get("aqarak_me", null); },
  // الأدمن بس بيشوف كل الحسابات (بتتحمّل بـ loadUsers) — غير كده: المستخدم الحالي بس
  users() {
    const me = this.current();
    const list = me && me.role === "admin" ? Store.get("aqarak_users_cache", []) : [];
    if (me && !list.some((u) => u.id === me.id)) list.push(me);
    return list;
  },
  remember(user) {
    try { Store.set("aqarak_me", user); } catch (e) { /* المساحة خلصت */ }
    return user;
  },
  // تسجيل خروج / حذف حساب: امسح كل النسخ المحفوظة في المتصفح
  forget() {
    ["aqarak_me", "aqarak_users_cache", "aqarak_favs_cache", "aqarak_notifs_cache", "aqarak_listings_cache", "aqarak_moderation_cache"]
      .forEach((k) => Store.remove(k));
  },
  // بيسأل السيرفر مين مسجل دخول (null = مفيش جلسة). لو النت فاصل بيرجع النسخة المحفوظة.
  async refresh() {
    try {
      const { user } = await Api.call("GET", "/api/auth/me");
      if (user) this.remember(user); else this.forget();
      return user;
    } catch (e) {
      return this.current();
    }
  },
  async register(payload) {
    const { user } = await Api.call("POST", "/api/auth/register", payload);
    return this.remember(user); // إشعارات الترحيب بيعملها السيرفر
  },
  async login(email, password) {
    const { user } = await Api.call("POST", "/api/auth/login", { email, password });
    return this.remember(user);
  },
  // Google: يا إما بيدخل على طول ({user}) يا إما حساب جديد ({needsSignup, profile})
  async google(credential) {
    const data = await Api.call("POST", "/api/auth/google", { credential });
    if (data.user) this.remember(data.user);
    return data;
  },
  async logout() {
    try { await Api.call("POST", "/api/auth/logout", {}); } catch (e) { /* حتى لو فشل، امسح الجلسة من هنا */ }
    this.forget();
  },
  forgot(email) { return Api.call("POST", "/api/auth/forgot", { email }); },
  reset(email, code, password) { return Api.call("POST", "/api/auth/reset", { email, code, password }); },
  // تعديل بيانات المستخدم الحالي (الاسم، الموبايل، التفضيلات، الصورة...)
  async updateMe(patch) {
    const { user } = await Api.call("PATCH", "/api/me", patch);
    this.remember(user);
    if (patch.prefs) Notifs.sync(); // السيرفر بيشيل تذكير "حدد تفضيلاتك"
    return user;
  },
  async changePassword(current, password) {
    const { user } = await Api.call("POST", "/api/me/password", { current, password });
    Notifs.sync();
    return this.remember(user);
  },
  async deleteMe() {
    await Api.call("DELETE", "/api/me", {});
    this.forget();
  },
  /* --- الأدمن --- */
  async loadUsers() {
    const { users } = await Api.call("GET", "/api/admin/users");
    try { Store.set("aqarak_users_cache", users); } catch (e) { /* ignore */ }
    return users;
  },
  async setRole(id, role) {
    const { user } = await Api.call("PATCH", `/api/admin/users/${encodeURIComponent(id)}`, { role });
    return user;
  },
  async removeUser(id) {
    await Api.call("DELETE", `/api/admin/users/${encodeURIComponent(id)}`, {});
    Listings.sync(); // إعلاناته اتمسحت من السيرفر
  },
};
// بيانات قديمة كانت بتتحفظ في المتصفح بس — مبقتش بتستخدم (كله بقى على السيرفر)
try {
  ["aqarak_users", "aqarak_session", "aqarak_listings", "aqarak_moderation"].forEach((k) => localStorage.removeItem(k));
  Object.keys(localStorage).filter((k) => /^aqarak_notifs_u_/.test(k)).forEach((k) => localStorage.removeItem(k));
} catch (e) { /* ignore */ }

/* ---------- Profile validation (مشتركة بين التسجيل والإعدادات) ---------- */
const MOBILE_RE = /^(?:\+?20)?0?1[0125]\d{8}$/;
function normalizeMobile(v) { return String(v || "").replace(/[\s-]/g, ""); }

/* ---------- Image compression (للصور قبل الحفظ في المتصفح) ---------- */
function compressImage(file, maxW = 1000, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const scale = Math.min(1, maxW / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ---------- Recommendations: مدى تطابق العقار مع تفضيلات المستخدم ----------
   بيرجّع رقم من 0 لـ 1. لو الغرض (شراء/إيجار) مش مطابق بيرجّع 0. */
function matchScore(l, prefs) {
  if (!prefs) return 0;
  let score = 0;
  let max = 0;
  if (prefs.purpose && prefs.purpose !== "both") {
    if ((prefs.purpose === "buy" ? "sale" : "rent") !== l.purpose) return 0;
    score += 2; max += 2;
  }
  if (prefs.types && prefs.types.length) { max += 3; if (prefs.types.includes(l.type)) score += 3; }
  if (prefs.cities && prefs.cities.length) { max += 3; if (prefs.cities.includes(l.city)) score += 3; }
  const budgetApplies = prefs.purpose !== "both" || l.purpose === "sale";
  if (budgetApplies && (prefs.budgetMin || prefs.budgetMax)) {
    max += 2;
    if (l.price >= (prefs.budgetMin || 0) && l.price <= (prefs.budgetMax || Infinity)) score += 2;
  }
  if (prefs.beds) { max += 1; if ((l.beds || 0) >= prefs.beds) score += 1; }
  return max ? score / max : 0;
}
function hasPrefs(user) { return !!(user && user.prefs); }

/* =========================================================
   الإعلانات والمفضلة والإشعارات — محفوظة على السيرفر
   المتصفح بيحتفظ بنسخة (cache) عشان الصفحة تفتح على طول،
   وبعدين بتتحدّث من السيرفر. لما البيانات تتغيّر بيطلع حدث:
     listings:changed  /  favs:changed  /  notifs:changed
   والصفحات بتسمعه وتعيد الرسم.
   ========================================================= */
const emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const saveCache = (key, value) => { try { Store.set(key, value); } catch (e) { /* المساحة خلصت */ } };

/* ---------- Moderation (الأدمن: إخفاء / تمييز / توثيق) ---------- */
const Moderation = {
  map: Store.get("aqarak_moderation_cache", {}), // { id: { hidden, featured, verified } }
  _flag(id, key, fallback) {
    const m = this.map[id];
    return m && key in m ? !!m[key] : !!fallback;
  },
  isHidden(id) { return this._flag(id, "hidden", false); },
  isVerified(l) { return this._flag(l.id, "verified", l.verified); },
  isFeatured(l) { return this._flag(l.id, "featured", l.featured); },
  async set(id, patch) {
    await Api.call("PATCH", `/api/admin/moderation/${encodeURIComponent(id)}`, patch);
    this.map[id] = { ...(this.map[id] || {}), ...patch };
    saveCache("aqarak_moderation_cache", this.map);
    emit("listings:changed");
  },
  setHidden(id, on) { return this.set(id, { hidden: !!on }); },
  setFeatured(id, on) { return this.set(id, { featured: !!on }); },
  setVerified(id, on) { return this.set(id, { verified: !!on }); },
};

/* ---------- Listings (التجريبية في data.js + الحقيقية من السيرفر) ---------- */
const Listings = {
  server: Store.get("aqarak_listings_cache", []),
  user() { return this.server; },                                     // إعلانات البروكرز الحقيقية
  everything() { return [...this.server, ...SEED_LISTINGS]; },         // كل الإعلانات (للأدمن)
  all() { return this.everything().filter((l) => !Moderation.isHidden(l.id)); }, // الظاهرة للناس
  get(id) { return this.everything().find((l) => l.id === id) || null; },
  isSeed(id) { return SEED_LISTINGS.some((l) => l.id === id); },
  byOwner(ownerId) { return this.server.filter((l) => l.ownerId === ownerId); },
  _store() {
    saveCache("aqarak_listings_cache", this.server);
    emit("listings:changed");
  },
  async sync() {
    try {
      const data = await Api.call("GET", "/api/listings");
      const changed = !same(data.listings, this.server) || !same(data.moderation, Moderation.map);
      this.server = data.listings;
      Moderation.map = data.moderation || {};
      saveCache("aqarak_moderation_cache", Moderation.map);
      if (changed) this._store();
    } catch (e) { /* النت فاصل — خلّي النسخة المحفوظة */ }
  },
  async add(payload) {
    const { listing } = await Api.call("POST", "/api/listings", payload);
    this.server = [listing, ...this.server];
    this._store();
    Notifs.sync();
    return listing;
  },
  async setPrice(id, price) {
    const { listing } = await Api.call("PATCH", `/api/listings/${encodeURIComponent(id)}`, { price });
    this.server = this.server.map((l) => (l.id === id ? listing : l));
    this._store();
    return listing;
  },
  async remove(id) {
    await Api.call("DELETE", `/api/listings/${encodeURIComponent(id)}`, {});
    this.server = this.server.filter((l) => l.id !== id);
    this._store();
  },
};

/* ---------- Favorites (لكل مستخدم — على السيرفر) ---------- */
const Favs = {
  ids: Store.get("aqarak_favs_cache", []),
  list() { return this.ids; },
  has(id) { return this.ids.includes(id); },
  _set(ids) {
    this.ids = ids;
    saveCache("aqarak_favs_cache", ids);
  },
  async sync() {
    const me = Auth.current();
    if (!me) return;
    try {
      // المفضلة القديمة اللي كانت في المتصفح بس → تترفع على السيرفر مرة واحدة
      const oldKey = `aqarak_favs_${me.id}`;
      const old = Store.get(oldKey, null);
      if (Array.isArray(old)) {
        for (const id of old) { try { await Api.call("POST", `/api/favorites/${encodeURIComponent(id)}`, {}); } catch (e) { /* ignore */ } }
        Store.remove(oldKey);
      }
      const { ids } = await Api.call("GET", "/api/favorites");
      if (!same(ids, this.ids)) {
        this._set(ids);
        refreshFavButtons();
        emit("favs:changed", { synced: true });
      }
    } catch (e) { /* النت فاصل */ }
  },
  // بيتغيّر على الشاشة على طول، ولو السيرفر رفض بيرجع زي ما كان
  toggle(id) {
    if (!Auth.current()) return null;
    const on = !this.has(id);
    this._set(on ? [...this.ids, id] : this.ids.filter((x) => x !== id));
    emit("favs:changed", { id, on });
    Api.call(on ? "POST" : "DELETE", `/api/favorites/${encodeURIComponent(id)}`, {}).catch((err) => {
      this._set(on ? this.ids.filter((x) => x !== id) : [...this.ids, id]);
      refreshFavButtons();
      emit("favs:changed", { id, on: !on });
      toast(t(err.message), "error");
    });
    return on;
  },
};
// قلوب المفضلة الظاهرة على الشاشة تتظبط حسب المفضلة الحالية
function refreshFavButtons() {
  document.querySelectorAll("[data-fav]").forEach((b) => {
    const on = Favs.has(b.dataset.fav);
    b.classList.toggle("on", on);
    b.setAttribute("aria-label", t(on ? "fav_remove" : "fav_add"));
  });
}

/* ---------- Notifications (الإشعارات — بيعملها السيرفر) ----------
   الإشعار بيتخزن كـ "نوع + بيانات" مش كنص، عشان يتعرض بالعربي أو الإنجليزي حسب اللغة.
   بيتجددوا من السيرفر كل شوية (Notifs.sync) ومعاهم عدد المحادثات اللي فيها رسايل جديدة. */
const NOTIF_KINDS = {
  welcome:      { icon: "house",     tone: "yellow", link: "index.html" },
  prefs_tip:    { icon: "sliders",   tone: "yellow", link: "preferences.html" },
  match:        { icon: "star",      tone: "yellow" },
  search_match: { icon: "bellRing",  tone: "yellow", link: "properties.html" },
  price_drop:   { icon: "priceDown", tone: "green" },
  published:    { icon: "check",     tone: "green" },
  verified:     { icon: "shield",    tone: "green" },
  featured:     { icon: "star",      tone: "yellow" },
  hidden:       { icon: "eyeOff",    tone: "red" },
  shown:        { icon: "eye",       tone: "green" },
  fav:          { icon: "heart",     tone: "red" },
  role:         { icon: "user",      tone: "blue", link: "settings.html#profile" },
  password:     { icon: "lock",      tone: "blue", link: "settings.html#security" },
};
const Notifs = {
  data: Store.get("aqarak_notifs_cache", null) || { list: [], unread: 0, chats: 0 },
  list() { return this.data.list; },
  unread() { return this.data.unread; },
  chatsUnread() { return this.data.chats; },
  _set(data) {
    const changed = !same(data, this.data);
    this.data = data;
    saveCache("aqarak_notifs_cache", data);
    if (changed) emit("notifs:changed");
  },
  async sync() {
    if (!Auth.current()) return;
    try {
      const d = await Api.call("GET", "/api/notifications");
      this._set({ list: d.notifications, unread: d.unread, chats: d.chatsUnread });
    } catch (e) { /* النت فاصل */ }
  },
  markRead(id) {
    const n = this.data.list.find((x) => x.id === id);
    if (!n || n.read) return;
    this._set({ ...this.data, list: this.data.list.map((x) => (x.id === id ? { ...x, read: true } : x)), unread: Math.max(0, this.data.unread - 1) });
    Api.call("POST", "/api/notifications/read", { id }).catch(() => {});
  },
  markAllRead() {
    this._set({ ...this.data, list: this.data.list.map((x) => ({ ...x, read: true })), unread: 0 });
    Api.call("POST", "/api/notifications/read", {}).catch(() => {});
  },
  // نص الإشعار باللغة الحالية
  text(n) {
    const v = n.vars || {};
    const per = v.purpose === "rent" ? ` ${t("per_month")}` : "";
    const vars = {
      title: loc(v.title) || "",
      area: v.area ? cityName(v.area) : "",
      price: v.price ? `${fmtPrice(v.price)}${per}` : "",
      old: v.old ? `${fmtPrice(v.old)}${per}` : "",
      name: v.name || "",
      role: v.role ? roleName(v.role) : "",
    };
    return { title: t(`notif_${n.kind}_t`, vars), body: t(`notif_${n.kind}_b`, vars) };
  },
};

function timeAgo(iso) {
  const sec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 45) return t("just_now");
  const rtf = new Intl.RelativeTimeFormat(Lang.get() === "ar" ? "ar-EG" : "en", { numeric: "auto" });
  const min = Math.round(sec / 60);
  if (min < 60) return rtf.format(-min, "minute");
  const hr = Math.round(min / 60);
  if (hr < 24) return rtf.format(-hr, "hour");
  const day = Math.round(hr / 24);
  if (day < 7) return rtf.format(-day, "day");
  return new Date(iso).toLocaleDateString(Lang.get() === "ar" ? "ar-EG" : "en-US", { day: "numeric", month: "short" });
}

/* ---------- Toast ---------- */
function toast(message, type = "") {
  let wrap = document.querySelector(".toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "toast-wrap";
    wrap.setAttribute("role", "status");
    wrap.setAttribute("aria-live", "polite");
    document.body.appendChild(wrap);
  }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  // أيقونة حسب نوع الرسالة بدل الإيموجي
  const ic = type === "success" ? ICONS.success : type === "error" ? ICONS.error : ICONS.info;
  el.innerHTML = `${ic}<span>${esc(message)}</span>`;
  wrap.appendChild(el);
  setTimeout(() => { el.style.transition = "opacity .3s"; el.style.opacity = "0"; }, type === "info-long" ? 9000 : 3200);
  setTimeout(() => el.remove(), type === "info-long" ? 9400 : 3600);
}

/* ---------- Modal ---------- */
function openModal(html, { size = "" } = {}) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true">
      <button class="modal-close" type="button" aria-label="${esc(t("close"))}">${ICONS.close}</button>
      ${html}
    </div>`;
  const close = () => {
    backdrop.remove();
    document.removeEventListener("keydown", onKey);
    if (!document.querySelector(".modal-backdrop")) document.body.style.overflow = "";
  };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector(".modal-close").addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  document.body.appendChild(backdrop);
  document.body.style.overflow = "hidden";
  return { el: backdrop.querySelector(".modal"), close };
}

/* ---------- Header & Footer ---------- */
function brandHTML(light = true) {
  // اللوجو: الرمز (assets/logo-mark.svg) + اسم الموقع كنص (عقارك / Aqarak)
  // light = النسخة الفاتحة للخلفيات السودا (الفوتر)
  return `<a href="index.html" class="brand" aria-label="${esc(t("brand"))}">
      <img class="brand-logo" src="assets/${light ? "logo-mark-light" : "logo-mark"}.svg" alt="" width="58" height="41">
      <span class="brand-name">${esc(t("brand"))}</span>
    </a>`;
}

/* ---------- علامة المفضلة في الهيدر ---------- */
// عدد العقارات في المفضلة (الموجودة والظاهرة بس)
function favCount() {
  if (!Auth.current()) return 0;
  const visible = new Set(Listings.all().map((l) => l.id));
  return Favs.list().filter((id) => visible.has(id)).length;
}
function updateFavBadge(animate) {
  const link = document.getElementById("favLink");
  if (!link) return;
  const n = favCount();
  const badge = document.getElementById("favCount");
  badge.textContent = n > 99 ? "99+" : n;
  badge.classList.toggle("hidden", !n);
  link.classList.toggle("has-favs", n > 0);
  link.setAttribute("aria-label", `${t("my_favs")}${n ? ` (${n})` : ""}`);
  if (animate) {
    link.classList.remove("bump");
    void link.offsetWidth; // يعيد تشغيل الحركة
    link.classList.add("bump");
  }
}
document.addEventListener("favs:changed", (e) => updateFavBadge(!(e.detail && e.detail.synced)));
document.addEventListener("listings:changed", () => updateFavBadge(false));

/* ---------- جرس الإشعارات في الهيدر ---------- */
function updateNotifBadge(animate) {
  const btn = document.getElementById("notifBtn");
  if (!btn) return;
  const n = Notifs.unread();
  const badge = document.getElementById("notifCount");
  badge.textContent = n > 99 ? "99+" : n;
  badge.classList.toggle("hidden", !n);
  btn.querySelector(".ic").outerHTML = n ? ICONS.bellRing : ICONS.bell;
  btn.setAttribute("aria-label", `${t("notifs")}${n ? ` (${n})` : ""}`);
  if (animate && n) {
    btn.classList.remove("ring");
    void btn.offsetWidth;
    btn.classList.add("ring");
  }
}

function renderNotifPanel() {
  const panel = document.getElementById("notifPanel");
  if (!panel) return;
  const list = Notifs.list();
  const fresh = list.filter((n) => !n.read);
  const earlier = list.filter((n) => n.read);

  // صف إشعار واحد: أيقونة + (العنوان والوقت في سطر) + الوصف في سطرين بالكتير
  const row = (n) => {
    const k = NOTIF_KINDS[n.kind] || {};
    const { title, body } = Notifs.text(n);
    return `<button type="button" class="np-item${n.read ? "" : " unread"}" data-notif="${esc(n.id)}">
      <span class="np-ico tone-${k.tone || "yellow"}">${ICONS[k.icon] || ICONS.bell}</span>
      <span class="np-text">
        <span class="np-row1">
          <strong>${esc(title)}</strong>
          <time datetime="${esc(n.createdAt)}">${esc(timeAgo(n.createdAt))}</time>
        </span>
        ${body ? `<small>${esc(body)}</small>` : ""}
      </span>
    </button>`;
  };
  const group = (label, items) => items.length
    ? `<div class="np-group"><div class="np-group-label">${esc(label)}</div>${items.map(row).join("")}</div>` : "";

  panel.innerHTML = `
    <div class="np-head">
      <strong>${esc(t("notifs"))}</strong>
      ${fresh.length ? `<button type="button" class="np-readall" data-np-readall>${LI("check-check")}<span>${esc(t("notif_mark_all"))}</span></button>` : ""}
    </div>
    <div class="np-list">
      ${list.length
        ? group(t("notif_new"), fresh) + group(t("notif_earlier"), earlier)
        : `<div class="np-empty">
            <span class="np-empty-ico">${ICONS.bellOff}</span>
            <strong>${esc(t("notif_empty"))}</strong>
            <small>${esc(t("notif_empty_sub"))}</small>
          </div>`}
    </div>`;
}

function setNotifOpen(open) {
  const menu = document.getElementById("notifMenu");
  if (!menu) return;
  if (open) {
    renderNotifPanel();
    const um = document.querySelector(".user-menu");
    if (um) um.classList.remove("open");
  }
  menu.classList.toggle("open", open);
  document.getElementById("notifBtn").setAttribute("aria-expanded", String(open));
}

document.addEventListener("notifs:changed", () => {
  updateNotifBadge(true);
  const menu = document.getElementById("notifMenu");
  if (menu && menu.classList.contains("open")) renderNotifPanel();
});
// لو الإشعارات اتحدّثت من تاب تاني
window.addEventListener("storage", (e) => {
  if (e.key === "aqarak_notifs_cache") {
    Notifs.data = Store.get("aqarak_notifs_cache", null) || { list: [], unread: 0, chats: 0 };
    emit("notifs:changed");
  }
});

/* ---------- أيقونة الرسايل في الهيدر (عدد المحادثات اللي فيها رسايل جديدة) ---------- */
function updateChatBadge() {
  const link = document.getElementById("chatLink");
  if (!link) return;
  const n = Notifs.chatsUnread();
  const badge = document.getElementById("chatCount");
  badge.textContent = n > 99 ? "99+" : n;
  badge.classList.toggle("hidden", !n);
  link.classList.toggle("has-unread", n > 0);
  link.setAttribute("aria-label", `${t("messages")}${n ? ` (${n})` : ""}`);
}
document.addEventListener("notifs:changed", updateChatBadge);

document.addEventListener("click", (e) => {
  const menu = document.getElementById("notifMenu");
  if (!menu) return;
  if (e.target.closest("#notifBtn")) { setNotifOpen(!menu.classList.contains("open")); return; }
  if (e.target.closest("[data-np-readall]")) { Notifs.markAllRead(); renderNotifPanel(); return; }
  const item = e.target.closest("[data-notif]");
  if (item) {
    const n = Notifs.list().find((x) => x.id === item.dataset.notif);
    Notifs.markRead(item.dataset.notif);
    setNotifOpen(false);
    if (!n) return;
    const k = NOTIF_KINDS[n.kind] || {};
    if (n.listingId && Listings.get(n.listingId)) openDetails(n.listingId);
    else if (k.link) location.href = k.link;
    return;
  }
  if (menu.classList.contains("open") && !e.target.closest("#notifMenu")) setNotifOpen(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const menu = document.getElementById("notifMenu");
    if (menu && menu.classList.contains("open")) { setNotifOpen(false); document.getElementById("notifBtn").focus(); }
  }
});

function renderHeader() {
  const host = document.getElementById("site-header");
  if (!host) return;
  const page = document.body.dataset.page;
  const params = new URLSearchParams(location.search);
  const mode = params.get("mode") === "rent" ? "rent" : "buy";
  const favsOnly = params.get("favs") === "1";
  const user = Auth.current();

  const active = (name) => {
    if (name === "home") return page === "home";
    if (name === "buy") return page === "props" && !favsOnly && mode === "buy";
    if (name === "rent") return page === "props" && !favsOnly && mode === "rent";
    if (name === "sell") return page === "sell";
    if (name === "map") return page === "map";
    return false;
  };

  let actions = "";
  if (user) {
    const initial = esc((user.name || "?").trim().charAt(0).toUpperCase());
    const avatar = user.picture
      ? `<span class="avatar"><img src="${esc(user.picture)}" alt="" referrerpolicy="no-referrer"></span>`
      : `<span class="avatar">${initial}</span>`;
    const canSell = user.role === "broker" || user.role === "admin";
    const favN = favCount();
    const unread = Notifs.unread();
    const chatsN = Notifs.chatsUnread();
    actions = `
      <a href="messages.html" class="fav-link chat-link${chatsN ? " has-unread" : ""} ${page === "messages" ? "active" : ""}" id="chatLink"
         aria-label="${esc(t("messages"))}${chatsN ? ` (${chatsN})` : ""}" title="${esc(t("messages"))}">
        ${ICONS.message}
        <span class="notif-count${chatsN ? "" : " hidden"}" id="chatCount">${chatsN > 99 ? "99+" : chatsN}</span>
      </a>
      <div class="notif-menu" id="notifMenu">
        <button type="button" class="fav-link notif-btn" id="notifBtn" aria-haspopup="true" aria-expanded="false"
                aria-label="${esc(t("notifs"))}${unread ? ` (${unread})` : ""}" title="${esc(t("notifs"))}">
          ${unread ? ICONS.bellRing : ICONS.bell}
          <span class="notif-count${unread ? "" : " hidden"}" id="notifCount">${unread > 99 ? "99+" : unread}</span>
        </button>
        <div class="notif-panel" id="notifPanel" role="dialog" aria-label="${esc(t("notifs"))}"></div>
      </div>
      <a href="properties.html?favs=1" class="fav-link${favN ? " has-favs" : ""} ${page === "props" && favsOnly ? "active" : ""}" id="favLink"
         aria-label="${esc(t("my_favs"))}${favN ? ` (${favN})` : ""}" title="${esc(t("my_favs"))}">
        ${ICONS.heart}
        <span class="fav-count${favN ? "" : " hidden"}" id="favCount">${favN > 99 ? "99+" : favN}</span>
      </a>
      <div class="user-menu">
        <button class="user-btn" type="button" aria-haspopup="true">
          ${avatar}<span class="user-name">${esc(user.name.split(" ")[0])}</span>
        </button>
        <div class="user-dropdown">
          <div class="ud-head">
            <strong>${esc(user.name)}</strong>
            <small>${esc(user.email)}</small><br>
            <span class="role-chip">${esc(roleName(user.role))}</span>
          </div>
          ${user.role === "admin" ? `<a href="admin.html">${ICONS.chart}<span>${esc(t("nav_admin"))}</span></a>` : ""}
          ${canSell ? `<a href="sell.html#mine">${ICONS.list}<span>${esc(t("my_listings"))}</span></a>` : ""}
          <a href="messages.html">${ICONS.message}<span>${esc(t("messages"))}</span></a>
          <a href="properties.html?favs=1">${ICONS.heart}<span>${esc(t("my_favs"))}</span></a>
          <a href="settings.html#prefs">${ICONS.sliders}<span>${esc(t("tab_prefs"))}</span></a>
          <a href="settings.html#profile">${ICONS.gear}<span>${esc(t("nav_settings"))}</span></a>
          <button type="button" class="logout" data-action="logout">${ICONS.logout}<span>${esc(t("logout"))}</span></button>
        </div>
      </div>`;
  } else {
    // الزوار (من غير حساب) بيشوفوا بس الدخول وإنشاء الحساب
    actions = `
      <a href="auth.html#login" class="btn btn-ghost" data-tab="login">${esc(t("login"))}</a>
      <a href="auth.html#signup" class="btn btn-primary btn-signup" data-tab="signup">${esc(t("signup"))}</a>`;
  }

  host.outerHTML = `
    <header class="site-header">
      <div class="container header-inner">
        ${brandHTML()}
        ${user ? `
        <nav class="main-nav" id="mainNav">
          <a href="index.html" class="${active("home") ? "active" : ""}">${esc(t("nav_home"))}</a>
          <a href="properties.html?mode=buy" class="${active("buy") ? "active" : ""}">${esc(t("nav_buy"))}</a>
          <a href="properties.html?mode=rent" class="${active("rent") ? "active" : ""}">${esc(t("nav_rent"))}</a>
          <a href="map.html" class="${active("map") ? "active" : ""}">${icon("map", "margin-inline-end:6px")}${esc(t("nav_map"))}</a>
          <a href="sell.html" class="${active("sell") ? "active" : ""}">${esc(t("nav_sell"))}</a>
          <a href="#" class="nav-lang" data-action="lang">${icon("globe", "margin-inline-end:8px")}${esc(t("lang_switch"))}</a>
        </nav>` : ""}
        <div class="header-actions">
          <button class="lang-btn${user ? " lang-btn-top" : ""}" type="button" data-action="lang" aria-label="${esc(t("lang_switch"))}" title="${esc(t("lang_switch"))}">${ICONS.globe}<span>${esc(t("lang_switch"))}</span></button>
          ${actions}
          ${user ? `<button class="menu-toggle" type="button" data-action="menu" aria-label="${esc(t("menu"))}">${ICONS.menu}</button>` : ""}
        </div>
      </div>
    </header>`;
}

function renderFooter() {
  const host = document.getElementById("site-footer");
  if (!host) return;
  host.outerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            ${brandHTML(true)}
            <p>${esc(t("footer_about"))}</p>
            <!-- حط روابط صفحاتك الحقيقية بدل # -->
            <div class="socials">
              <a href="#" aria-label="Facebook">${ICONS.facebook}</a>
              <a href="#" aria-label="Instagram">${ICONS.instagram}</a>
              <a href="#" aria-label="X">${ICONS.xTwitter}</a>
              <a href="#" aria-label="TikTok">${ICONS.tiktok}</a>
              <a href="#" aria-label="WhatsApp">${ICONS.whatsapp}</a>
            </div>
          </div>
          <div>
            <h4>${esc(t("footer_links"))}</h4>
            <ul>
              <li><a href="properties.html?mode=buy">${esc(t("nav_buy"))}</a></li>
              <li><a href="properties.html?mode=rent">${esc(t("nav_rent"))}</a></li>
              <li><a href="map.html">${esc(t("nav_map"))}</a></li>
              <li><a href="sell.html">${esc(t("nav_sell"))}</a></li>
            </ul>
          </div>
          <div>
            <h4>${esc(t("footer_contact"))}</h4>
            <ul class="contact-list">
              <li>${ICONS.pin}<span>${esc(loc(CITY_NAME))}</span></li>
              <li>${ICONS.user}<a href="auth.html#signup">${esc(t("signup"))}</a></li>
              <li>${ICONS.lock}<a href="auth.html#login">${esc(t("login"))}</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">${esc(t("rights"))}</div>
      </div>
    </footer>`;
}

/* ---------- Property card ---------- */
function priceHTML(l) {
  return `${fmtPrice(l.price)}${l.purpose === "rent" ? ` <small>${esc(t("per_month"))}</small>` : ""}`;
}

function propCard(l) {
  const user = Auth.current();
  const fav = user && Favs.has(l.id);
  const showYield = user && user.role === "investor" && l.purpose === "sale" && l.yield;
  const cover = l.images && l.images[0];
  const media = cover
    ? `<img src="${esc(cover)}" alt="${esc(loc(l.title))}" loading="lazy" onerror="imgFail(this)">`
    : `<div class="img-fallback">${ICONS.house}</div>`;
  const meta = [];
  if (l.beds) meta.push(`<span>${ICONS.bed}${l.beds} ${esc(t("beds"))}</span>`);
  if (l.baths) meta.push(`<span>${ICONS.bath}${l.baths} ${esc(t("baths"))}</span>`);
  meta.push(`<span>${ICONS.area}${fmtNum(l.size)} ${esc(t("sqm"))}</span>`);

  return `
    <article class="prop-card" data-prop-id="${esc(l.id)}" tabindex="0">
      <div class="prop-media">
        ${media}
        <span class="prop-tag ${l.purpose === "rent" ? "rent" : ""}">${esc(t(l.purpose === "rent" ? "for_rent" : "for_sale"))}</span>
        ${Moderation.isVerified(l) ? `<span class="verified-badge">${ICONS.verified}${esc(t("verified"))}</span>` : ""}
        <button class="fav-btn ${fav ? "on" : ""}" type="button" data-fav="${esc(l.id)}"
                aria-label="${esc(t(fav ? "fav_remove" : "fav_add"))}">${ICONS.heart}</button>
        ${l.pano ? `<span class="pano-chip" title="${esc(t("pano_has"))}">${ICONS.pano}<bdi dir="ltr">360°</bdi></span>` : ""}
        ${showYield ? `<span class="yield-chip">${esc(t("yield_chip", { v: l.yield }))}</span>` : ""}
        ${hasPrefs(user) && matchScore(l, user.prefs) >= 0.75 ? `<span class="match-chip">${ICONS.star}${esc(t("match_chip"))}</span>` : ""}
      </div>
      <div class="prop-body">
        <div class="prop-price">${priceHTML(l)}</div>
        <h3 class="prop-title">${esc(loc(l.title))}</h3>
        <div class="prop-loc">${ICONS.pin}<span>${esc(loc(l.address) || cityName(l.city))}</span></div>
        <div class="prop-meta">${meta.join("")}</div>
      </div>
    </article>`;
}

/* ---------- Hero video (فيديو الخلفية) ----------
   بيشغّل الفيديو من غير صوت وبيعيده على طول، ومعاه زرار إيقاف/تشغيل. */
function setupHeroVideo(video, toggle) {
  if (!video) return;
  const cfg = window.AQARAK_CONFIG || {};
  if (cfg.HERO_POSTER_URL) video.poster = cfg.HERO_POSTER_URL;
  const reduce = false; // لو عايز تحترم إعداد "تقليل الحركة" في الجهاز: matchMedia("(prefers-reduced-motion: reduce)").matches
  if (!cfg.HERO_VIDEO_URL) { if (toggle) toggle.remove(); return; }
  video.muted = true;
  video.setAttribute("muted", "");
  video.autoplay = !reduce;
  video.src = cfg.HERO_VIDEO_URL;
  let userPaused = false;
  const tryPlay = () => { if (!reduce && !userPaused && video.paused) video.play().catch(() => {}); };
  video.addEventListener("canplay", tryPlay);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tryPlay(); });
  const setBtn = () => {
    if (!toggle) return;
    const playing = !video.paused;
    toggle.innerHTML = playing ? LI("pause") : LI("play");
    toggle.setAttribute("aria-label", t(playing ? "video_pause" : "video_play"));
    toggle.title = t(playing ? "video_pause" : "video_play");
  };
  video.addEventListener("play", setBtn);
  video.addEventListener("pause", setBtn);
  video.addEventListener("error", () => { video.removeAttribute("src"); if (toggle) toggle.remove(); });
  tryPlay();
  setBtn();
  if (toggle) toggle.addEventListener("click", () => {
    if (video.paused) { userPaused = false; video.play().catch(() => {}); }
    else { userPaused = true; video.pause(); }
  });
}

/* ---------- Location helpers ---------- */
function hasCoords(l) { return typeof l.lat === "number" && typeof l.lng === "number"; }
// موقع العقار، ولو مش متحدد بنستخدم مركز المدينة
function listingCoords(l) {
  if (hasCoords(l)) return [l.lat, l.lng];
  return CITY_CENTERS[l.city] || null;
}
// خريطة Google جوه صفحة التفاصيل (embed — مش محتاجة API key)
function googleEmbedUrl(lat, lng, zoom = 15) {
  return `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&hl=${Lang.get()}&output=embed`;
}
function googleMapsLink(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/* ---------- Property details modal ---------- */
function openDetails(id) {
  const l = Listings.get(id);
  if (!l) return;
  const user = Auth.current();
  const fav = user && Favs.has(l.id);
  const images = (l.images && l.images.length) ? l.images : [];
  const isInvestor = user && (user.role === "investor" || user.role === "admin");
  const coords = listingCoords(l);

  const panoBtn = l.pano
    ? `<button type="button" class="pano-btn" data-open-pano>${ICONS.pano}<span>${esc(t("pano_open"))}</span></button>` : "";
  const gallery = images.length
    ? `<div class="gallery-main"><img id="galleryMain" src="${esc(images[0])}" alt="" onerror="imgFail(this)">${panoBtn}</div>
       ${images.length > 1 ? `<div class="gallery-thumbs">${images.map((src, i) =>
          `<img src="${esc(src)}" data-src="${esc(src)}" class="${i === 0 ? "active" : ""}" alt="" onerror="this.remove()">`).join("")}</div>` : ""}`
    : `<div class="gallery-main"><div class="img-fallback">${ICONS.house}</div>${panoBtn}</div>`;

  let investBox = "";
  if (isInvestor && l.purpose === "sale" && l.yield) {
    const monthly = Math.round((l.price * l.yield) / 100 / 12 / 100) * 100;
    investBox = `<div class="invest-box">
        <div style="font-weight:800;margin-bottom:4px">${icon("chart", "color:var(--success)")} ${esc(t("invest_title"))}</div>
        <div>${esc(t("invest_text", { v: "§" })).replace("§", `<strong>${esc(l.yield)}</strong>`)}</div>
        <div>${esc(t("invest_rent", { v: fmtPrice(monthly) }))}</div>
      </div>`;
  }

  let contact;
  if (user) {
    const phone = String(l.phone || "").replace(/\D/g, "");
    const wa = phone.startsWith("0") ? `2${phone}` : phone;
    // محادثة داخل الموقع: للإعلانات الحقيقية بس (التجريبية مالهاش صاحب حقيقي)
    let chatBtn = "";
    if (Listings.isSeed(l.id)) chatBtn = `<small class="chat-note">${ICONS.message}${esc(t("chat_demo_note"))}</small>`;
    else if (l.ownerId !== user.id) chatBtn = `<button type="button" class="btn btn-outline btn-block" data-start-chat>${ICONS.message}${esc(t("chat_start"))}</button>`;
    contact = `
      <div class="owner"><span class="avatar">${esc((l.owner || "?").charAt(0))}</span>
        <div><small>${esc(t("listed_by"))}</small>${esc(l.owner || t("owner"))}</div></div>
      <div style="font-weight:800;font-size:18px;direction:ltr;text-align:center">${esc(l.phone || "")}</div>
      <a class="btn btn-primary btn-block" href="tel:${esc(phone)}">${ICONS.phone}${esc(t("call"))}</a>
      <a class="btn btn-whatsapp btn-block" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener">${icon("whatsapp", "font-size:19px")}${esc(t("whatsapp"))}</a>
      ${chatBtn}`;
  } else {
    contact = `
      <div style="text-align:center;color:var(--muted);font-weight:600">${icon("lock", "font-size:28px;display:block;margin:0 auto 8px;color:var(--yellow-dark)")}${esc(t("login_to_contact"))}</div>
      <a class="btn btn-primary btn-block" href="auth.html?next=${encodeURIComponent(location.pathname.split("/").pop() + location.search)}#login">${esc(t("login"))}</a>`;
  }

  const facts = [
    [typeName(l.type), t("type")],
    [`${fmtNum(l.size)} ${t("sqm")}`, t("area")],
    [l.beds || "—", t("beds")],
    [l.baths || "—", t("baths")],
  ];

  const { el } = openModal(`
    ${gallery}
    <div class="modal-pad">
      <div class="detail-grid">
        <div>
          <div class="detail-head">
            <span class="prop-tag ${l.purpose === "rent" ? "rent" : ""}" style="position:static;display:inline-block;margin-bottom:10px">${esc(t(l.purpose === "rent" ? "for_rent" : "for_sale"))}</span>
            ${Moderation.isVerified(l) ? `<span class="verified-badge" style="margin-inline-start:6px;vertical-align:2px">${ICONS.verified}${esc(t("verified"))}</span>` : ""}
            <h2>${esc(loc(l.title))}</h2>
            <div class="prop-loc">${ICONS.pin}<span>${esc(loc(l.address))} — ${esc(cityName(l.city))}</span></div>
          </div>
          <div class="detail-price">${priceHTML(l)}</div>
          <div class="detail-facts">${facts.map(([v, k]) => `<div class="fact"><strong>${esc(v)}</strong><small>${esc(k)}</small></div>`).join("")}</div>
          ${investBox}
          <h3 style="margin:0 0 6px">${esc(t("description"))}</h3>
          <p style="margin:0;color:var(--ink-2);white-space:pre-line">${esc(loc(l.desc))}</p>
          ${priceHistoryHTML(l)}
          ${coords ? `
          <h3 style="margin:22px 0 8px">${icon("map", "color:var(--yellow-dark)")} ${esc(t("location_title"))}</h3>
          <div class="detail-map">
            <iframe src="${esc(googleEmbedUrl(coords[0], coords[1]))}" referrerpolicy="no-referrer-when-downgrade" title="${esc(t("location_title"))}" allowfullscreen></iframe>
          </div>
          ${hasCoords(l) ? "" : `<small class="hint">${esc(t("location_approx"))}</small>`}
          <div class="btn-row" style="margin-top:10px">
            <a class="btn btn-outline btn-sm" href="${esc(googleMapsLink(coords[0], coords[1]))}" target="_blank" rel="noopener">${ICONS.external}<span>${esc(t("open_gmaps"))}</span></a>
            <a class="btn btn-ghost btn-sm" href="map.html?focus=${encodeURIComponent(l.id)}">${ICONS.crosshairs}<span>${esc(t("nearby_on_map"))}</span></a>
          </div>` : ""}
        </div>
        <aside class="contact-card">
          ${contact}
          <button class="btn btn-ghost btn-block fav-text-btn ${fav ? "on" : ""}" type="button" data-fav-modal="${esc(l.id)}">
            ${ICONS.heart}
            <span>${esc(t(fav ? "fav_remove" : "fav_add"))}</span>
          </button>
        </aside>
      </div>
    </div>`);

  el.querySelectorAll(".gallery-thumbs img").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const main = el.querySelector("#galleryMain");
      if (main) main.src = thumb.dataset.src;
      el.querySelectorAll(".gallery-thumbs img").forEach((x) => x.classList.toggle("active", x === thumb));
    });
  });
  const favBtn = el.querySelector("[data-fav-modal]");
  favBtn.addEventListener("click", () => {
    const on = handleFav(l.id);
    if (on === null) return;
    favBtn.classList.toggle("on", on);
    favBtn.querySelector("span").textContent = t(on ? "fav_remove" : "fav_add");
  });
  const panoOpen = el.querySelector("[data-open-pano]");
  if (panoOpen) panoOpen.addEventListener("click", () => openPano(l.pano, loc(l.title)));
  const chatStart = el.querySelector("[data-start-chat]");
  if (chatStart) chatStart.addEventListener("click", async () => {
    chatStart.disabled = true;
    try {
      const { chat } = await Api.call("POST", "/api/chats", { listingId: l.id });
      location.href = `messages.html?c=${encodeURIComponent(chat.id)}`;
    } catch (err) {
      chatStart.disabled = false;
      toast(t(err.message), "error");
    }
  });
  bindPriceChart(el);
}

/* ---------- جولة 360° (Pannellum — مكتبة مجانية مفتوحة المصدر) ---------- */
let pannellumReady = null;
function loadPannellum() {
  if (!pannellumReady) {
    loadCssOnce("https://cdnjs.cloudflare.com/ajax/libs/pannellum/2.5.6/pannellum.css");
    pannellumReady = loadScriptOnce("https://cdnjs.cloudflare.com/ajax/libs/pannellum/2.5.6/pannellum.js")
      .catch((e) => { pannellumReady = null; throw e; });
  }
  return pannellumReady;
}
function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error("err_network"));
    document.head.appendChild(s);
  });
}
function loadCssOnce(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = href;
  document.head.appendChild(l);
}
async function openPano(src, title = "") {
  const { el, close } = openModal(`
    <div class="pano-wrap">
      <div class="pano-head">${ICONS.pano}<strong>${esc(t("pano_title"))}</strong>${title ? `<span>${esc(title)}</span>` : ""}</div>
      <div class="pano-view" id="panoView" dir="ltr"><div class="map-loading">${esc(t("pano_loading"))}</div></div>
      <small class="pano-hint">${esc(t("pano_hint"))}</small>
    </div>`, { size: "lg" });
  el.classList.add("modal-pano");
  try {
    await loadPannellum();
    const host = el.querySelector("#panoView");
    if (!host) return;
    host.innerHTML = "";
    window.pannellum.viewer(host, {
      type: "equirectangular",
      panorama: src,
      autoLoad: true,
      autoRotate: -2,
      autoRotateInactivityDelay: 4000,
      showZoomCtrl: true,
      showFullscreenCtrl: true,
      compass: false,
      hfov: 105,
      strings: { loadingLabel: t("pano_loading"), loadButtonLabel: t("pano_open") },
    });
  } catch (e) {
    const host = el.querySelector("#panoView");
    if (host) host.innerHTML = `<div class="map-loading">${esc(t("pano_error"))}</div>`;
    else close();
  }
}

/* ---------- سجل السعر (رسم بياني بسيط SVG) ---------- */
function priceHistoryHTML(l) {
  const pts = (l.priceHistory || []).filter((p) => p && p.price && p.at);
  if (!pts.length) return "";
  const per = l.purpose === "rent" ? ` ${t("per_month")}` : "";
  const locale = Lang.get() === "ar" ? "ar-EG-u-nu-latn" : "en-US"; // أرقام عادية زي الأسعار
  const fmtDate = (iso, opts = { month: "short", year: "numeric" }) => new Date(iso).toLocaleDateString(locale, opts);
  const first = pts[0].price;
  const last = pts[pts.length - 1].price;
  const pct = first ? Math.round(((last - first) / first) * 1000) / 10 : 0;
  const trend = pts.length < 2 || pct === 0
    ? `<span class="ph-trend flat">${esc(t("hist_flat"))}</span>`
    : `<span class="ph-trend ${pct < 0 ? "down" : "up"}">${pct < 0 ? ICONS.priceDown : ICONS.chart}${esc(t(pct < 0 ? "hist_down" : "hist_up", { v: Math.abs(pct) }))}</span>`;

  // الرسم: محور الوقت أفقي، السعر رأسي
  const W = 560; const H = 170; const padL = 12; const padR = 12; const padT = 18; const padB = 30;
  const times = pts.map((p) => new Date(p.at).getTime());
  const t0 = Math.min(...times); const t1 = Math.max(...times);
  const prices = pts.map((p) => p.price);
  let lo = Math.min(...prices); let hi = Math.max(...prices);
  if (lo === hi) { lo *= 0.95; hi *= 1.05; }
  const span = hi - lo; lo -= span * 0.15; hi += span * 0.15;
  const x = (tm) => (t1 === t0 ? W / 2 : padL + ((tm - t0) / (t1 - t0)) * (W - padL - padR));
  const y = (p) => padT + (1 - (p - lo) / (hi - lo)) * (H - padT - padB);
  // خط متدرّج (السعر بيفضل ثابت لحد التغيير الجاي)
  let d = "";
  pts.forEach((p, i) => {
    const px = x(times[i]); const py = y(p.price);
    if (i === 0) d += `M${px.toFixed(1)},${py.toFixed(1)}`;
    else d += ` H${px.toFixed(1)} V${py.toFixed(1)}`;
  });
  const lastX = x(times[times.length - 1]);
  const area = `${d} V${H - padB} H${x(times[0]).toFixed(1)} Z`;
  const dots = pts.map((p, i) => `
    <circle class="ph-dot${i === pts.length - 1 ? " last" : ""}" cx="${x(times[i]).toFixed(1)}" cy="${y(p.price).toFixed(1)}" r="${i === pts.length - 1 ? 5.5 : 4}"
      tabindex="0" data-ph="${i}"><title>${esc(fmtDate(p.at, { day: "numeric", month: "short", year: "numeric" }))}: ${esc(fmtPrice(p.price) + per)}</title></circle>`).join("");
  const labels = pts.length > 1
    ? `<text x="${x(times[0]).toFixed(1)}" y="${H - 8}" text-anchor="start" class="ph-axis">${esc(fmtDate(pts[0].at))}</text>
       <text x="${lastX.toFixed(1)}" y="${H - 8}" text-anchor="end" class="ph-axis">${esc(fmtDate(pts[pts.length - 1].at))}</text>` : "";

  const rows = [...pts].reverse().map((p, i, arr) => {
    const prev = arr[i + 1];
    const diff = prev ? p.price - prev.price : 0;
    const chip = !prev ? `<span class="ph-chip">${esc(t("hist_listed"))}</span>`
      : `<span class="ph-chip ${diff < 0 ? "down" : "up"}">${diff < 0 ? "−" : "+"}${esc(fmtNum(Math.abs(diff)))}</span>`;
    return `<li><span>${esc(fmtDate(p.at, { day: "numeric", month: "short", year: "numeric" }))}</span><strong>${esc(fmtPrice(p.price))}</strong>${chip}</li>`;
  }).join("");

  return `
    <section class="price-history">
      <div class="ph-head">
        <h3>${ICONS.history} ${esc(t("hist_title"))}</h3>
        ${trend}
      </div>
      ${pts.length > 1 ? `
      <div class="ph-chart">
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t("hist_title"))}" direction="ltr" style="direction:ltr">
          <line x1="${padL}" x2="${W - padR}" y1="${H - padB}" y2="${H - padB}" class="ph-base"/>
          <path d="${area}" class="ph-area"/>
          <path d="${d}" class="ph-line"/>
          ${dots}
          ${labels}
        </svg>
        <div class="ph-tip hidden" aria-hidden="true"></div>
      </div>` : `<p class="hint" style="margin:0 0 8px">${esc(t("hist_single"))}</p>`}
      <ul class="ph-list">${rows}</ul>
    </section>`;
}
// لما الماوس يقف على نقطة: يظهر التاريخ والسعر
function bindPriceChart(root) {
  const chart = root.querySelector(".ph-chart");
  if (!chart) return;
  const tip = chart.querySelector(".ph-tip");
  const show = (dot) => {
    const title = dot.querySelector("title");
    if (!title) return;
    tip.textContent = title.textContent;
    const box = chart.getBoundingClientRect();
    const r = dot.getBoundingClientRect();
    tip.style.left = `${r.left + r.width / 2 - box.left}px`;
    tip.style.top = `${r.top - box.top}px`;
    tip.classList.remove("hidden");
  };
  chart.querySelectorAll(".ph-dot").forEach((dot) => {
    dot.addEventListener("mouseenter", () => show(dot));
    dot.addEventListener("focus", () => show(dot));
    dot.addEventListener("mouseleave", () => tip.classList.add("hidden"));
    dot.addEventListener("blur", () => tip.classList.add("hidden"));
  });
}

function handleFav(id) {
  if (!Auth.current()) { toast(t("fav_login")); return null; }
  const on = Favs.toggle(id);
  toast(t(on ? "fav_added" : "fav_removed"), "success");
  document.querySelectorAll(`[data-fav="${CSS.escape(id)}"]`).forEach((b) => {
    b.classList.toggle("on", on);
    b.setAttribute("aria-label", t(on ? "fav_remove" : "fav_add"));
  });
  return on;
}

/* ---------- Global events ---------- */
document.addEventListener("click", (e) => {
  const favBtn = e.target.closest("[data-fav]");
  if (favBtn) { e.stopPropagation(); handleFav(favBtn.dataset.fav); return; }

  const card = e.target.closest("[data-prop-id]");
  if (card) { openDetails(card.dataset.propId); return; }

  const action = e.target.closest("[data-action]");
  if (action) {
    const a = action.dataset.action;
    if (a === "lang") Lang.toggle();
    if (a === "menu") document.getElementById("mainNav").classList.toggle("open");
    if (a === "logout") {
      action.disabled = true;
      Auth.logout().then(() => {
        sessionStorage.setItem("aqarak_flash", t("logged_out"));
        location.href = "index.html";
      });
    }
    return;
  }

  const userBtn = e.target.closest(".user-btn");
  const menu = document.querySelector(".user-menu");
  if (userBtn) { menu.classList.toggle("open"); setNotifOpen(false); return; }
  if (menu && !e.target.closest(".user-menu")) menu.classList.remove("open");
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.matches && e.target.matches("[data-prop-id]")) openDetails(e.target.dataset.propId);
});

/* ---------- Init ---------- */
renderHeader();
renderFooter();
applyI18n();

// الهيدر بيغمق لما تنزل في الصفحة
(function () {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 10);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

// الأقسام بتظهر بنعومة وانت بتنزل (بس اللي تحت الشاشة وقت الفتح)
document.addEventListener("DOMContentLoaded", () => {
  if (!("IntersectionObserver" in window)) return;
  const targets = [...document.querySelectorAll("main .section, main .stats-band, main .cta")]
    .filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.9);
  if (!targets.length) return;
  targets.forEach((el) => el.classList.add("reveal"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  targets.forEach((el) => io.observe(el));
});

// التأكد من الجلسة مع السيرفر في كل صفحة (لو اتقفلت، أو الباسورد اتغيّر، أو الأدمن حذف الحساب)
if (!window.__aqarakRedirecting && document.body.dataset.page !== "auth") {
  const before = JSON.stringify(Auth.current());
  // الإعلانات والمفضلة والإشعارات من السيرفر (الصفحة اتعرضت من النسخة المحفوظة لحد ما يردوا)
  if (Auth.current()) {
    Listings.sync();
    Favs.sync();
    Notifs.sync();
    // الإشعارات والرسايل الجديدة كل 45 ثانية (والتاب مفتوح بس)، والإعلانات لما ترجع للتاب
    setInterval(() => { if (!document.hidden) Notifs.sync(); }, 45000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) { Notifs.sync(); Listings.sync(); }
    });
  }
  Auth.refresh().then((user) => {
    if (!user) {
      const here = location.pathname.split("/").pop() || "index.html";
      location.replace(`auth.html?next=${encodeURIComponent(here + location.search + location.hash)}#login`);
    } else if (JSON.stringify(user) !== before) {
      location.reload(); // البيانات اتغيّرت من مكان تاني (جهاز تاني أو الأدمن) → اعرض الجديدة
    }
  });
}

// رسالة بعد التحويل من صفحة لصفحة (زي بعد تسجيل الدخول)
try {
  const flash = window.__aqarakRedirecting ? null : sessionStorage.getItem("aqarak_flash");
  if (flash) { sessionStorage.removeItem("aqarak_flash"); setTimeout(() => toast(flash, "success"), 150); }
} catch (e) { /* ignore */ }
