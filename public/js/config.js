/* =========================================================
   إعدادات الموقع
   ---------------------------------------------------------
   تسجيل الدخول بـ Google:
   1) ادخل على https://console.cloud.google.com/apis/credentials
   2) Create credentials → OAuth client ID → Web application
   3) في "Authorized JavaScript origins" ضيف:
        http://localhost:5500   (أو البورت اللي بتشغل عليه الموقع)
   4) انسخ الـ Client ID وحطه تحت بين العلامتين
   ملحوظة: زرار Google مش هيشتغل لو فتحت الملف بدبل كليك،
   لازم تشغل الموقع من سيرفر محلي (زي Live Server في VS Code).
   ========================================================= */

window.AQARAK_CONFIG = {
  GOOGLE_CLIENT_ID: "", // مثال: "1234567890-abc123.apps.googleusercontent.com"

  // كود الأدمن مبقاش هنا — بقى على السيرفر (متغير ADMIN_CODE على Vercel)
  // عشان محدش يقدر يشوفه من ملفات الموقع. على جهازك الكود 2005.
  // ملحوظة: لو فعّلت Google، حط نفس الـ Client ID كمان في Vercel (متغير GOOGLE_CLIENT_ID).

  // خرايط Google (صفحة "الخريطة" + اختيار موقع العقار):
  // 1) من https://console.cloud.google.com فعّل "Maps JavaScript API" (محتاج حساب فواتير)
  // 2) Credentials → Create credentials → API key، وحدد الـ key على موقعك (HTTP referrers)
  // 3) حط الـ key هنا. لو سبته فاضي، الموقع بيستخدم خريطة OpenStreetMap المجانية مؤقتاً.
  // (خريطة العقار في صفحة التفاصيل بتشتغل بـ Google على طول من غير key.)
  GOOGLE_MAPS_API_KEY: "",

  // فيديو الخلفية في الواجهة (الرئيسية + صفحة الدخول).
  // حالياً فيديو مجاني من Pexels (رخصة Pexels: مسموح الاستخدام من غير ذكر المصدر).
  // تقدر تحط فيديو خاص بيك في assets/ وتكتب مساره هنا، مثلاً: "assets/hero.mp4"
  HERO_VIDEO_URL: "https://videos.pexels.com/video-files/17224730/17224730-hd_1280_720_30fps.mp4",
  // الصورة اللي بتظهر لحد ما الفيديو يحمّل (أو لو المستخدم قافل الحركة في جهازه)
  HERO_POSTER_URL: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=70",
};
