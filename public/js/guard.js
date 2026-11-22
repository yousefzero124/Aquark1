/* =========================================================
   حماية الصفحات: الموقع كله محتاج تسجيل دخول.
   الملف ده بيتحمّل في <head> قبل أي حاجة، ولو مفيش حساب مسجّل
   بيخفي الصفحة ويحوّل على صفحة الدخول، وبعد الدخول بيرجع لنفس الصفحة.
   (صفحة auth.html بس هي اللي مفتوحة للكل)
   ========================================================= */
(function () {
  function toLogin() {
    window.__aqarakRedirecting = true;
    document.documentElement.style.visibility = "hidden";
    var here = location.pathname.split("/").pop() || "index.html";
    location.replace("auth.html?next=" + encodeURIComponent(here + location.search + location.hash) + "#login");
  }
  try {
    var session = JSON.parse(localStorage.getItem("aqarak_session") || "null");
    var users = JSON.parse(localStorage.getItem("aqarak_users") || "[]");
    var ok = session && users.some(function (u) { return u.id === session.userId; });
    if (!ok) toLogin();
  } catch (e) {
    toLogin();
  }
})();
