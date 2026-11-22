// نقطة دخول الـ API على Vercel — كل طلبات /api/* بتيجي هنا (شوف vercel.json)
const { handleApi } = require("../server/api");

module.exports = async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  let pathname = url.pathname;
  // لو Vercel غيّر المسار بسبب الـ rewrite، المسار الأصلي بيكون في __path
  if (!pathname.startsWith("/api/") || pathname === "/api/index") {
    pathname = `/api/${url.searchParams.get("__path") || ""}`;
  }
  await handleApi(req, res, pathname);
};
