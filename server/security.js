// =========================================================
// الحماية
// - IP الحقيقي للزائر (من غير ما حد يقدر يزوّره)
// - منع الإيميلات المؤقتة / الوهمية (قايمة + التأكد إن الدومين بيستقبل إيميلات)
// - قواعد كلمة المرور
// - التأكد إن الطلب جاي من الموقع نفسه (حماية زيادة من CSRF)
// - حد عام لعدد الطلبات من نفس الـ IP (ضد السبام والـ flood)
// ملحوظة: هجمات الـ DDoS الكبيرة بيصدّها Vercel نفسه قبل ما توصل للسيرفر.
// =========================================================
const dns = require("dns").promises;

const IS_VERCEL = !!process.env.VERCEL;

/* ---------- IP الزائر ----------
   على Vercel: x-real-ip / x-vercel-forwarded-for بيحطهم Vercel نفسه (الزائر مش بيقدر يغيّرهم).
   على جهازك: عنوان الاتصال (أو cf-connecting-ip لو اللينك المؤقت من Cloudflare). */
function clientIp(req) {
  const h = req.headers || {};
  const first = (v) => String(v || "").split(",")[0].trim();
  if (IS_VERCEL) return first(h["x-real-ip"]) || first(h["x-vercel-forwarded-for"]) || first(h["x-forwarded-for"]) || "?";
  return first(h["cf-connecting-ip"]) || (req.socket && req.socket.remoteAddress) || "?";
}

/* ---------- الإيميلات المؤقتة / الوهمية ---------- */
// أشهر خدمات الإيميل المؤقت (اللي بيتعمل في ثانية ويتمسح لوحده)
const DISPOSABLE = new Set(`
10minutemail.com 10minutemail.net 10minutemail.co.uk 10minemail.com 20minutemail.com 30minutemail.com 33mail.com
anonbox.net anonymbox.com armyspy.com binkmail.com bobmail.info boximail.com burnermail.io byom.de
chacuo.net clrmail.com cool.fr.nf correotemporal.org cuvox.de dayrep.com deadaddress.com despam.it
disposablemail.com dispostable.com dodgit.com dropmail.me dudmail.com einrot.com emailondeck.com
emailfake.com emailtemporanea.com emailtemporanea.net email-temp.com emltmp.com emlpro.com emlhub.com
fakeinbox.com fakemail.net fakemailgenerator.com fakemail.fr filzmail.com fleckens.hu
getairmail.com getnada.com nada.email gishpuppy.com guerrillamail.com guerrillamail.net guerrillamail.org
guerrillamail.biz guerrillamail.de guerrillamail.info guerrillamailblock.com grr.la sharklasers.com spam4.me
pokemail.net harakirimail.com hidemail.de imgof.com incognitomail.com incognitomail.org inboxbear.com
inboxkitten.com jetable.org jourrapide.com kasmail.com kaspop.com keepmymail.com killmail.com
mailcatch.com maildrop.cc mailexpire.com mailforspam.com mailinator.com mailinator.net mailinator2.com
mailismagic.com mailmoat.com mailnesia.com mailnull.com mailpoof.com mailsac.com mailslurp.com
mailtemp.info mailtothis.com mailzilla.com meltmail.com mintemail.com moakt.com moakt.cc mohmal.com
mvrht.com mytemp.email mytrashmail.com no-spam.ws nowmymail.com objectmail.com onewaymail.com
pookmail.com proxymail.eu putthisinyourspamdatabase.com quickinbox.com rcpt.at rhyta.com rmqkr.net
safetymail.info selfdestructingmail.com sendspamhere.com shieldemail.com sogetthis.com spam.la
spambog.com spambox.us spamcero.com spamday.com spamex.com spamfree24.org spamgourmet.com spamhole.com
spaml.de spammotel.com spamspot.com superrito.com suremail.info teleworm.us temp-mail.org temp-mail.io
temp-mail.ru tempmail.com tempmail.net tempmail.de tempmail.plus tempmail.dev tempmailo.com tempmailaddress.com
tempinbox.com tempinbox.co.uk temporaryemail.net temporaryinbox.com temporarymail.com tempr.email
tempsky.com thankyou2010.com thisisnotmyrealemail.com throwam.com throwawaymail.com tmail.ws tmailinator.com
tmpmail.org tmpmail.net tmpeml.com trash-mail.com trash-mail.de trashmail.com trashmail.net trashmail.me
trashmail.de trashmail.io trashmail.ws trashymail.com trbvm.com tyldd.com uggsrock.com veryrealemail.com
wegwerfmail.de wegwerfmail.net wegwerfemail.de wh4f.org yopmail.com yopmail.fr yopmail.net cool.fr.nf
jetable.fr.nf nospam.ze.tc nomail.xl.cx mega.zik.dj speed.1s.fr courriel.fr.nf moncourrier.fr.nf
monemail.fr.nf monmail.fr.nf zetmail.com zippymail.info zoemail.org mail.tm mailto.plus fexpost.com
fexbox.org mailbox.in.ua rover.info inpwa.com intempmail.com tempmailin.com luxusmail.org emailnax.com
`.trim().split(/\s+/));
// أسامي بتبان في دومينات الإيميل المؤقت
const DISPOSABLE_HINT = /(?:^|[.-])(?:temp-?mail|tmp-?mail|10-?minute|throw-?away|trash-?mail|fake-?mail|fake-?inbox|guerrilla|mailinator|yopmail|disposable|burner-?mail|spam-?box|getnada|maildrop|mohmal)/i;
// دومينات معروفة وشغالة — مش محتاجة نسأل عليها
const TRUSTED = new Set("gmail.com googlemail.com yahoo.com ymail.com hotmail.com outlook.com live.com msn.com icloud.com me.com mac.com aol.com proton.me protonmail.com gmx.com gmx.net zoho.com yandex.com mail.ru".split(" "));

const mxCache = new Map(); // domain → { ok, at }
async function domainReceivesMail(domain) {
  const c = mxCache.get(domain);
  if (c && Date.now() - c.at < 6 * 3600 * 1000) return c.ok;
  let ok;
  try {
    const mx = await withTimeout(dns.resolveMx(domain), 2500);
    ok = Array.isArray(mx) && mx.some((r) => r && r.exchange && r.exchange !== ".");
  } catch (e) {
    const code = e && e.code;
    if (code === "ENOTFOUND") ok = false;                          // الدومين مش موجود أصلاً → وهمي
    else if (code === "ENODATA") ok = await hasAddress(domain);    // من غير MX بس ليه عنوان = ممكن يستقبل
    else ok = true;                                                // الـ DNS بطيء/واقع → منمنعش الناس بسببه
  }
  mxCache.set(domain, { ok, at: Date.now() });
  if (mxCache.size > 2000) mxCache.clear();
  return ok;
}
async function hasAddress(domain) {
  try { const a = await withTimeout(dns.resolve4(domain), 2000); return a.length > 0; } catch (e) { return false; }
}
function withTimeout(p, ms) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), ms))]);
}

/** بيرجع مفتاح خطأ لو الإيميل مؤقت أو وهمي، أو null لو تمام */
async function emailProblem(email) {
  const domain = String(email).split("@")[1] || "";
  if (!domain || domain.length > 253 || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain) || domain.includes("..")) return "err_email";
  if (TRUSTED.has(domain)) return null;
  const parts = domain.split(".");
  for (let i = 0; i < parts.length - 1; i++) {        // sub.mailinator.com كمان
    if (DISPOSABLE.has(parts.slice(i).join("."))) return "err_email_disposable";
  }
  if (DISPOSABLE_HINT.test(domain)) return "err_email_disposable";
  if (!(await domainReceivesMail(domain))) return "err_email_domain";
  return null;
}

/* ---------- كلمة المرور ---------- */
const COMMON = new Set("password password1 password123 12345678 123456789 1234567890 qwerty123 qwertyuiop 11111111 00000000 abc12345 abcd1234 iloveyou 1q2w3e4r 1qaz2wsx aa123456 a1234567 asdf1234 zxcvbnm1 admin123 welcome1 letmein1 passw0rd 87654321 12341234 11223344 qwer1234".split(" "));
/** 8 حروف على الأقل، فيها حرف ورقم، ومش من الباسوردات المشهورة */
function passwordProblem(p) {
  if (typeof p !== "string" || p.length < 8 || p.length > 200) return "err_pass_len";
  if (!/[a-z؀-ۿ]/i.test(p) || !/\d/.test(p)) return "err_pass_weak";
  if (COMMON.has(p.toLowerCase())) return "err_pass_common";
  return null;
}

/* ---------- الطلب جاي من الموقع نفسه؟ ----------
   المتصفحات بتبعت Origin مع أي طلب بيغيّر حاجة. لو جاي من موقع تاني → مرفوض. */
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // مش من متصفح (أو طلب عادي من نفس الصفحة في متصفحات قديمة)
  let host;
  try { host = new URL(origin).host; } catch (e) { return false; }
  const own = String(req.headers["x-forwarded-host"] || req.headers.host || "");
  return !!own && host === own;
}

/* ---------- حد عام لكل IP (في الذاكرة — سريع ومن غير قاعدة بيانات) ---------- */
const flood = new Map();
function floodCheck(ip, max = 300, windowMs = 60 * 1000) {
  const t = Date.now();
  let r = flood.get(ip);
  if (!r || r.reset < t) { r = { n: 0, reset: t + windowMs }; flood.set(ip, r); }
  r.n += 1;
  if (flood.size > 10000) for (const [k, v] of flood) if (v.reset < t) flood.delete(k);
  return r.n <= max;
}

module.exports = { clientIp, emailProblem, passwordProblem, sameOrigin, floodCheck, _DISPOSABLE: DISPOSABLE };
