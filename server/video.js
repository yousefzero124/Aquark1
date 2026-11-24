// =========================================================
// فيديوهات الإعلانات
// - على Vercel: Vercel Blob (المتصفح بيرفع الفيديو لـ Blob على طول، لأن Vercel
//   مش بيقبل طلبات أكبر من 4.5 ميجا). محتاج BLOB_READ_WRITE_TOKEN (بيتحط لوحده
//   لما تعمل Blob store من تبويب Storage وتربطه بالمشروع).
// - على جهازك: الفيديو بيتحفظ في data/videos ويتعرض من /api/video/<اسم>
// - وفي الحالتين ينفع لينك يوتيوب بدل الرفع.
// =========================================================
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { DATA_DIR } = require("./store");

const IS_VERCEL = !!process.env.VERCEL;
const MAX_MB = 50;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const TYPES = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
const VIDEO_DIR = path.join(DATA_DIR, "videos");
const LOCAL_RE = /^\/api\/video\/(v_[a-z0-9]+\.(?:mp4|webm|mov))$/;
const BLOB_RE = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/videos\/[A-Za-z0-9._\-/]+$/i;
const YT_RE = /^youtube:[A-Za-z0-9_-]{11}$/;

// "blob" (Vercel Blob) / "local" (ملف على الجهاز) / "off" (على Vercel من غير Blob — يوتيوب بس)
function mode() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  return IS_VERCEL ? "off" : "local";
}

// كل فيديو مربوط بصاحبه: على Blob اسمه بيبدأ بـ videos/<id المستخدم>، وعلى الجهاز بـ v_<بصمة المستخدم>
const ownerTag = (userId) => crypto.createHash("sha256").update(String(userId)).digest("hex").slice(0, 10);
const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function ownedBy(v, userId) {
  if (BLOB_RE.test(v)) return new RegExp(`/videos/${escRe(userId)}[-.]`).test(v);
  const m = v.match(LOCAL_RE);
  return !!m && m[1].startsWith(`v_${ownerTag(userId)}`);
}

/** بيتأكد إن لينك الفيديو من مصدر مسموح وإنه بتاع المستخدم ده (owners = ids مسموحة)، ويرجّعه (أو null) */
function clean(v, fail, owners = []) {
  if (v == null || v === "") return null;
  if (typeof v !== "string" || v.length > 400) fail(400, "err_video");
  if (YT_RE.test(v)) return v;
  const ok = BLOB_RE.test(v) || (() => { const m = v.match(LOCAL_RE); return m && fs.existsSync(path.join(VIDEO_DIR, m[1])); })();
  if (!ok) return fail(400, "err_video");
  // محدش يقدر يحط (وبعدين يمسح) فيديو حد تاني
  if (!owners.filter(Boolean).some((id) => ownedBy(v, id))) return fail(403, "err_video");
  return v;
}

/** شكل الفيديو اللي بيروح للموقع */
function toPublic(v) {
  if (!v) return null;
  if (YT_RE.test(v)) return { type: "youtube", id: v.slice(8) };
  return { type: "file", url: v };
}

/** مسح الفيديو لما الإعلان يتمسح أو الفيديو يتغيّر (من غير ما يوقّف أي حاجة لو فشل) */
async function remove(v) {
  if (!v) return;
  try {
    const m = v.match(LOCAL_RE);
    if (m) { fs.unlinkSync(path.join(VIDEO_DIR, m[1])); return; }
    if (BLOB_RE.test(v) && process.env.BLOB_READ_WRITE_TOKEN) {
      const { del } = await import("@vercel/blob");
      await del(v);
    }
  } catch (e) { /* ignore */ }
}

/** على الجهاز: استقبال الفيديو (الطلب نفسه هو الملف) وحفظه */
function saveLocal(req, fail, userId) {
  const type = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  const ext = TYPES[type];
  if (!ext) fail(415, "err_video_type");
  const declared = Number(req.headers["content-length"] || 0);
  if (declared > MAX_BYTES) fail(413, "err_video_big");
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  const name = `v_${ownerTag(userId)}${Date.now().toString(36)}${crypto.randomBytes(5).toString("hex")}.${ext}`;
  const file = path.join(VIDEO_DIR, name);
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(file);
    let size = 0;
    let failed = false;
    const abort = (err) => {
      if (failed) return;
      failed = true;
      out.destroy();
      fs.unlink(file, () => {});
      reject(err);
    };
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BYTES) { abort(Object.assign(new Error("err_video_big"), { status: 413 })); req.destroy(); }
    });
    req.on("error", abort);
    out.on("error", abort);
    req.pipe(out);
    out.on("finish", () => {
      if (failed) return;
      if (size < 1024) { fs.unlink(file, () => {}); return reject(Object.assign(new Error("err_video_type"), { status: 400 })); }
      resolve({ url: `/api/video/${name}` });
    });
  });
}

/** على الجهاز: عرض الفيديو مع دعم التقديم والترجيع (Range) */
function serveLocal(req, res, name) {
  if (!/^v_[a-z0-9]+\.(?:mp4|webm|mov)$/.test(name)) return false;
  const file = path.join(VIDEO_DIR, name);
  let stat;
  try { stat = fs.statSync(file); } catch (e) { return false; }
  const ext = path.extname(name).slice(1);
  const type = Object.keys(TYPES).find((k) => TYPES[k] === ext) || "application/octet-stream";
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
  res.setHeader("Content-Type", type);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : stat.size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : stat.size - 1;
    start = Math.max(0, start); end = Math.min(stat.size - 1, end);
    if (start > end) { res.statusCode = 416; res.setHeader("Content-Range", `bytes */${stat.size}`); res.end(); return true; }
    res.statusCode = 206;
    res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
    res.setHeader("Content-Length", end - start + 1);
    fs.createReadStream(file, { start, end }).pipe(res);
  } else {
    res.statusCode = 200;
    res.setHeader("Content-Length", stat.size);
    fs.createReadStream(file).pipe(res);
  }
  return true;
}

/** على Vercel: إصدار تصريح للمتصفح يرفع الفيديو لـ Blob مباشرة */
async function blobToken(req, body, userId) {
  const { handleUpload } = await import("@vercel/blob/client");
  return handleUpload({
    body,
    request: req,
    onBeforeGenerateToken: async (pathname) => {
      // الاسم لازم يبدأ بـ id صاحبه (videos/<id>.mp4) عشان نعرف الفيديو بتاع مين
      if (!/^videos\/[A-Za-z0-9._-]{1,100}$/.test(pathname) || !pathname.startsWith(`videos/${userId}.`)) throw new Error("Invalid pathname");
      return {
        allowedContentTypes: Object.keys(TYPES),
        maximumSizeInBytes: MAX_BYTES,
        addRandomSuffix: true,
        tokenPayload: userId,
      };
    },
  });
}

module.exports = { mode, clean, toPublic, remove, saveLocal, serveLocal, blobToken, MAX_MB, TYPES };
