/* =========================================================
   حماية الصفحات: لازم تسجيل دخول عشان تشوف أي حاجة في الموقع
   الملف ده بيتحمّل في <head> قبل أي حاجة، فلو مفيش جلسة
   بيحوّل لصفحة الدخول قبل ما الصفحة تظهر.
   (aqarak_me = نسخة من بيانات المستخدم بعد ما السيرفر يأكد الدخول؛
    main.js بيتأكد من السيرفر تاني بعد ما الصفحة تفتح)
   ========================================================= */
(function () {
  function toLogin() {
    window.__aqarakRedirecting = true;
    document.documentElement.style.visibility = "hidden";
    var here = location.pathname.split("/").pop() || "/";
    location.replace("auth?next=" + encodeURIComponent(here + location.search + location.hash) + "#login");
  }
  try {
    var me = JSON.parse(localStorage.getItem("aqarak_me") || "null");
    if (!me || !me.id) toLogin();
  } catch (e) { toLogin(); }
})();
