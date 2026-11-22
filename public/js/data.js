/* =========================================================
   بيانات الموقع — عقارك بورسعيد
   الموقع مخصص لمدينة بورسعيد بس، والتقسيم جوه المدينة بالأحياء.
   (المتغير اسمه CITIES عشان باقي الكود، بس اللي جواه أحياء بورسعيد)
   الإعلانات اللي البروكر بيضيفها بتتحفظ في المتصفح (localStorage)
   وبتظهر جنب العقارات التجريبية دي.
   ========================================================= */

const CITY_NAME = { ar: "بورسعيد", en: "Port Said" };

// أحياء بورسعيد
const CITIES = {
  east:      { ar: "حي الشرق", en: "East District" },
  arab:      { ar: "حي العرب", en: "Arab District" },
  manakh:    { ar: "حي المناخ", en: "Manakh District" },
  zohour:    { ar: "حي الزهور", en: "Zohour District" },
  dawahy:    { ar: "حي الضواحي", en: "Dawahy District" },
  south:     { ar: "حي الجنوب", en: "South District" },
  west:      { ar: "حي غرب", en: "West District" },
  portfouad: { ar: "بورفؤاد", en: "Port Fouad" },
};

// مركز كل حي على الخريطة [خط العرض, خط الطول]
const CITY_CENTERS = {
  east:      [31.2625, 32.3045],
  arab:      [31.2570, 32.2965],
  manakh:    [31.2520, 32.2885],
  zohour:    [31.2465, 32.2785],
  dawahy:    [31.2400, 32.2875],
  south:     [31.2240, 32.2930],
  west:      [31.2560, 32.2700],
  portfouad: [31.2490, 32.3220],
};
// مركز بورسعيد (الخريطة بتفتح عليه)
const MAP_CENTER = [31.2530, 32.2980];
const MAP_ZOOM = 13;

// لعنوان المستخدم: أحياء بورسعيد + "خارج بورسعيد"
const USER_AREAS = { ...CITIES, outside: { ar: "خارج بورسعيد", en: "Outside Port Said" } };

const TYPES = {
  apartment: { ar: "شقة", en: "Apartment" },
  villa:     { ar: "فيلا", en: "Villa" },
  duplex:    { ar: "دوبلكس", en: "Duplex" },
  chalet:    { ar: "شاليه", en: "Chalet" },
  office:    { ar: "مكتب", en: "Office" },
  land:      { ar: "أرض", en: "Land" },
};

const img = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1000&q=70`;

// عقارات تجريبية (هتتبدل بالداتا الحقيقية بعدين)
const SEED_LISTINGS = [
  {
    id: "s1", purpose: "sale", type: "villa", city: "portfouad", featured: true, verified: true,
    title: { ar: "فيلا مستقلة بحديقة في بورفؤاد", en: "Standalone villa with garden in Port Fouad" },
    address: { ar: "بورفؤاد، الحي الثاني", en: "Port Fouad, 2nd District" },
    price: 9500000, size: 380, beds: 5, baths: 4, yield: 6.0,
    lat: 31.2448, lng: 32.3248,
    images: [img("1613490493576-7fde63acd811"), img("1600596542815-ffad4c1539a9"), img("1600210492486-724fe5c67fb0")],
    desc: {
      ar: "فيلا مستقلة تشطيب سوبر لوكس، حديقة خاصة، دورين وروف، جراج، وقريبة من معدية بورفؤاد.",
      en: "Super-lux standalone villa with a private garden, two floors plus roof, garage, close to the Port Fouad ferry.",
    },
    owner: "أحمد سمير", phone: "01000000001", createdAt: "2026-11-10",
  },
  {
    id: "s2", purpose: "sale", type: "apartment", city: "east", featured: true, verified: true,
    title: { ar: "شقة 3 غرف بفيو على البحر", en: "3-bedroom sea-view apartment" },
    address: { ar: "حي الشرق، كورنيش بورسعيد", en: "East District, Port Said Corniche" },
    price: 3200000, size: 150, beds: 3, baths: 2, yield: 7.2,
    lat: 31.2662, lng: 32.3012,
    images: [img("1502672260266-1c1ef2d93688"), img("1522708323590-d24dbb6b0267")],
    desc: {
      ar: "شقة دور سابع بأسانسير، تشطيب كامل، 3 غرف وريسبشن كبير وبلكونة على البحر مباشرة.",
      en: "Seventh-floor apartment with elevator, fully finished, 3 bedrooms, a large living room and a balcony right on the sea.",
    },
    owner: "منى خالد", phone: "01000000002", createdAt: "2026-11-14",
  },
  {
    id: "s3", purpose: "rent", type: "apartment", city: "arab", featured: true, verified: true,
    title: { ar: "شقة مفروشة في حي العرب", en: "Furnished apartment in Arab District" },
    address: { ar: "حي العرب، شارع محمد علي", en: "Arab District, Mohamed Ali St." },
    price: 9000, size: 120, beds: 2, baths: 1,
    lat: 31.2585, lng: 32.2978,
    images: [img("1560448204-e02f11c3d0e2"), img("1600607687939-ce8a6c25118c")],
    desc: {
      ar: "شقة مفروشة بالكامل بفرش مودرن، تكييفات في كل الغرف، قريبة من المواصلات والخدمات.",
      en: "Fully furnished in a modern style, A/C in every room, close to transport and services.",
    },
    owner: "كريم عادل", phone: "01000000003", createdAt: "2026-11-16",
  },
  {
    id: "s4", purpose: "sale", type: "duplex", city: "zohour", featured: true, verified: true,
    title: { ar: "دوبلكس بروف خاص في الزهور", en: "Duplex with private roof in Zohour" },
    address: { ar: "حي الزهور، قرب نادي المريخ", en: "Zohour District, near El Marikh Club" },
    price: 4100000, size: 240, beds: 4, baths: 3, yield: 6.6,
    lat: 31.2478, lng: 32.2792,
    images: [img("1600585154340-be6161a56a0c"), img("1600607687939-ce8a6c25118c")],
    desc: {
      ar: "دوبلكس 4 غرف بروف خاص 70 متر، تشطيب الترا سوبر لوكس، في عمارة حديثة بأمن.",
      en: "4-bedroom duplex with a 70 m² private roof, ultra-lux finishing, in a modern building with security.",
    },
    owner: "سارة محمود", phone: "01000000004", createdAt: "2026-11-08",
  },
  {
    id: "s5", purpose: "rent", type: "chalet", city: "portfouad", featured: true,
    title: { ar: "شاليه على البحر في بورفؤاد", en: "Beachfront chalet in Port Fouad" },
    address: { ar: "بورفؤاد، شاطئ بورفؤاد", en: "Port Fouad, Port Fouad Beach" },
    price: 18000, size: 90, beds: 2, baths: 1,
    lat: 31.2507, lng: 32.3222,
    images: [img("1512917774080-9991f1c4c750"), img("1600210492486-724fe5c67fb0")],
    desc: {
      ar: "شاليه قدام البحر مباشرة، جاردن صغيرة، متاح للإيجار الشهري في الصيف.",
      en: "Right in front of the sea with a small garden, available for monthly summer rental.",
    },
    owner: "يوسف حسن", phone: "01000000005", createdAt: "2026-11-12",
  },
  {
    id: "s6", purpose: "rent", type: "office", city: "east", featured: true, verified: true,
    title: { ar: "مكتب إداري على شارع 23 يوليو", en: "Office on 23rd of July Street" },
    address: { ar: "حي الشرق، شارع 23 يوليو", en: "East District, 23rd of July St." },
    price: 20000, size: 140, beds: 0, baths: 2,
    lat: 31.2612, lng: 32.3068,
    images: [img("1497366216548-37526070297c")],
    desc: {
      ar: "مكتب إداري متشطب بالكامل، تكييف، 3 غرف وريسبشن، في منطقة تجارية حيوية.",
      en: "Fully finished office with A/C, 3 rooms and a reception, in a busy commercial area.",
    },
    owner: "شركة النخبة", phone: "01000000006", createdAt: "2026-11-05",
  },
  {
    id: "s7", purpose: "sale", type: "apartment", city: "manakh", featured: false, verified: true,
    title: { ar: "شقة لقطة في المناخ", en: "Great-value apartment in Manakh" },
    address: { ar: "حي المناخ، شارع الثلاثيني", en: "Manakh District, El Thalateeny St." },
    price: 1650000, size: 110, beds: 2, baths: 1, yield: 8.1,
    lat: 31.2528, lng: 32.2895,
    images: [img("1545324418-cc1a3fa10c00"), img("1522708323590-d24dbb6b0267")],
    desc: {
      ar: "شقة غرفتين وصالة، دور تالت، قريبة من المدارس والأسواق، مناسبة للاستثمار.",
      en: "2-bedroom apartment on the third floor, near schools and markets, good for investment.",
    },
    owner: "نهى إبراهيم", phone: "01000000007", createdAt: "2026-11-02",
  },
  {
    id: "s8", purpose: "sale", type: "land", city: "south", featured: false,
    title: { ar: "أرض مباني 400 متر في الجنوب", en: "400 m² building plot in South District" },
    address: { ar: "حي الجنوب، قرب الطريق الدائري", en: "South District, near the Ring Road" },
    price: 2400000, size: 400, beds: 0, baths: 0, yield: 9.0,
    lat: 31.2235, lng: 32.2940,
    images: [img("1500382017468-9049fed747ef")],
    desc: {
      ar: "أرض مباني مسجلة، تصلح لبناء عمارة سكنية، في منطقة بتتطور بسرعة.",
      en: "Registered building plot, suitable for a residential building, in a fast-growing area.",
    },
    owner: "محمد فؤاد", phone: "01000000008", createdAt: "2026-10-28",
  },
  {
    id: "s9", purpose: "rent", type: "villa", city: "dawahy", featured: false,
    title: { ar: "فيلا للإيجار في الضواحي", en: "Villa for rent in Dawahy" },
    address: { ar: "حي الضواحي، قرب ستاد بورسعيد", en: "Dawahy District, near Port Said Stadium" },
    price: 30000, size: 300, beds: 4, baths: 3,
    lat: 31.2405, lng: 32.2868,
    images: [img("1580587771525-78b9dba3b914"), img("1600596542815-ffad4c1539a9")],
    desc: {
      ar: "فيلا 4 غرف بجاردن، هادية ومناسبة للعائلات، قريبة من الخدمات.",
      en: "4-bedroom villa with a garden, quiet and family-friendly, close to services.",
    },
    owner: "هاني رشدي", phone: "01000000009", createdAt: "2026-11-15",
  },
];

/* =========================================================
   200 عقار تجريبي إضافي (افتراضية) — بتتولّد بنفس الشكل كل مرة
   (نفس الأرقام والصور على كل الأجهزة، والـ id ثابت: g1 … g200)
   ========================================================= */
(function addDemoListings() {
  // رقم عشوائي ثابت (نفس التسلسل كل مرة)
  let seed = 20261122;
  const rnd = () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const pickN = (arr, n) => { const c = [...arr]; const out = []; while (out.length < n && c.length) out.push(c.splice(Math.floor(rnd() * c.length), 1)[0]); return out; };
  const weighted = (obj) => { const total = Object.values(obj).reduce((a, b) => a + b, 0); let r = rnd() * total; for (const [k, w] of Object.entries(obj)) { r -= w; if (r <= 0) return k; } return Object.keys(obj)[0]; };
  const round = (v, step) => Math.round(v / step) * step;

  /* --- الصور (مجمّعة حسب النوع) --- */
  const PH = {
    villa: ["1613490493576-7fde63acd811", "1600596542815-ffad4c1539a9", "1580587771525-78b9dba3b914", "1564013799919-ab600027ffc6", "1570129477492-45c003edd2be", "1568605114967-8130f3a36994", "1600566753190-17f0baa2a6c3", "1600047509807-ba8f99d2cdde", "1605276374104-dee2a0ed3cd6", "1583608205776-bfd35f0d9f83", "1576941089067-2de3c901e126", "1416331108676-a22ccb276e35", "1628624747186-a941c476b7ef", "1600607688969-a5bfcd646154"],
    modern: ["1600585154340-be6161a56a0c", "1600573472550-8090b5e0745e", "1600585154526-990dced4db0d", "1600563438938-a9a27216b4f5", "1600047509807-ba8f99d2cdde", "1600566753190-17f0baa2a6c3"],
    pool: ["1512917774080-9991f1c4c750", "1599809275671-b5942cabc7a2", "1613977257363-707ba9348227", "1602343168117-bb8ffe3e2e9f", "1566073771259-6a8506099945", "1571896349842-33c89424de2d", "1582268611958-ebfd161ef9cf"],
    interior: ["1502672260266-1c1ef2d93688", "1522708323590-d24dbb6b0267", "1560448204-e02f11c3d0e2", "1600607687939-ce8a6c25118c", "1545324418-cc1a3fa10c00", "1600210492486-724fe5c67fb0", "1493809842364-78817add7ffb", "1484154218962-a197022b5858", "1505691938895-1758d7feb511", "1524758631624-e2822e304c36", "1512918728675-ed5a9ecdebfd", "1554995207-c18c203602cb", "1586023492125-27b2c045efd7", "1560185007-cde436f6a4d0", "1560185893-a55cbc8c57e8", "1595526114035-0d45ed16cfbf", "1611892440504-42a792e24d32", "1600210491892-03d54c0aaf87", "1600566752355-35792bedcfea"],
    office: ["1497366216548-37526070297c", "1497366811353-6870744d04b2", "1497215728101-856f4ea42174", "1504384308090-c894fdcc538d", "1462826303086-329426d1aef5"],
    land: ["1500382017468-9049fed747ef"],
  };
  const photos = (type) => {
    const set = {
      apartment: () => pickN(PH.interior, 3),
      villa: () => [pick(PH.villa), ...pickN(PH.interior, 2)],
      duplex: () => [pick(PH.modern), ...pickN(PH.interior, 2)],
      chalet: () => [pick(PH.pool), ...pickN(PH.interior, 1)],
      office: () => pickN(PH.office, 2),
      land: () => [PH.land[0]],
    }[type]();
    return set.map(img);
  };

  /* --- الأحياء: سعر المتر (بيع) + أماكن حقيقية للعنوان --- */
  const AREA = {
    east:      { m2: 32000, sea: true,  spots: [["كورنيش بورسعيد", "Port Said Corniche"], ["شارع 23 يوليو", "23rd of July St."], ["شارع فلسطين", "Palestine St."], ["شارع صفية زغلول", "Safia Zaghloul St."], ["قرب ممشى ديليسبس", "near De Lesseps Walk"]] },
    portfouad: { m2: 30000, sea: true,  spots: [["الحي الأول", "1st District"], ["الحي الثاني", "2nd District"], ["الحي الثالث", "3rd District"], ["قرب المعدية", "near the ferry"], ["شاطئ بورفؤاد", "Port Fouad Beach"]] },
    arab:      { m2: 24000, sea: false, spots: [["شارع محمد علي", "Mohamed Ali St."], ["شارع الثلاثيني", "El Thalateeny St."], ["شارع كسرى", "Kesra St."], ["قرب سوق الحميدي", "near El Hamidy Market"]] },
    zohour:    { m2: 22000, sea: false, spots: [["قرب نادي المريخ", "near El Marikh Club"], ["مساكن الزهور", "Zohour Housing"], ["شارع عاطف السادات", "Atef El Sadat St."], ["قرب مول بورسعيد", "near Port Said Mall"]] },
    manakh:    { m2: 19000, sea: false, spots: [["شارع الثلاثيني", "El Thalateeny St."], ["شارع صلاح سالم", "Salah Salem St."], ["شارع عرابي", "Orabi St."], ["قرب سوق المناخ", "near Manakh Market"]] },
    dawahy:    { m2: 18000, sea: false, spots: [["قرب ستاد بورسعيد", "near Port Said Stadium"], ["عمارات الإسكان", "Housing Blocks"], ["منطقة الجولف", "Golf Area"], ["شارع النصر", "El Nasr St."]] },
    west:      { m2: 15000, sea: false, spots: [["شارع رمسيس", "Ramses St."], ["قرب ميدان المنشية", "near El Manshia Square"], ["شارع الأمين", "El Amin St."], ["قرب المنطقة الصناعية", "near the industrial zone"]] },
    south:     { m2: 14000, sea: false, spots: [["قرب الطريق الدائري", "near the Ring Road"], ["الإسكان الاجتماعي", "Social Housing"], ["قرب بحيرة المنزلة", "near Lake Manzala"], ["مدينة السلام", "El Salam City"]] },
  };
  const WHERE = {
    apartment: { east: 4, portfouad: 3, arab: 3, zohour: 3, manakh: 2, dawahy: 2, west: 1, south: 1 },
    villa:     { portfouad: 4, zohour: 2, dawahy: 2, south: 2, west: 1 },
    duplex:    { portfouad: 2, zohour: 3, east: 2, dawahy: 2, arab: 1 },
    chalet:    { portfouad: 5, east: 2 },
    office:    { east: 4, arab: 3, manakh: 2, zohour: 1 },
    land:      { south: 4, west: 3, dawahy: 2, portfouad: 1 },
  };

  /* --- التشطيب --- */
  const FINISH = [
    { ar: "سوبر لوكس", en: "super-lux", f: 1.12, w: 4 },
    { ar: "الترا سوبر لوكس", en: "ultra super-lux", f: 1.25, w: 2 },
    { ar: "لوكس", en: "lux", f: 1.0, w: 2 },
    { ar: "نص تشطيب", en: "semi-finished", f: 0.78, w: 1 },
  ];
  const pickFinish = () => { const r = rnd() * 9; let acc = 0; for (const f of FINISH) { acc += f.w; if (r <= acc) return f; } return FINISH[0]; };

  const FLOORS = [["الأرضي", "ground"], ["الأول", "1st"], ["التاني", "2nd"], ["التالت", "3rd"], ["الرابع", "4th"], ["الخامس", "5th"], ["السادس", "6th"], ["السابع", "7th"], ["التامن", "8th"], ["التاسع", "9th"], ["العاشر", "10th"]];

  const FEATURES = {
    home: [["أسانسير", "an elevator"], ["جراج", "a garage"], ["أمن 24 ساعة", "24/7 security"], ["غاز طبيعي", "natural gas"], ["تكييفات", "A/C units"], ["بلكونة واسعة", "a large balcony"], ["قريبة من المدارس", "close to schools"], ["قريبة من المواصلات", "close to transport"], ["مطبخ مجهز", "a fitted kitchen"], ["عداد كهرباء خاص", "a private electricity meter"]],
    villa: [["حديقة خاصة", "a private garden"], ["حمام سباحة", "a swimming pool"], ["جراج لعربيتين", "a two-car garage"], ["روف", "a roof terrace"], ["غرفة مربية", "a maid's room"], ["أمن 24 ساعة", "24/7 security"], ["تدفئة مركزية", "central heating"]],
    chalet: [["قدام البحر مباشرة", "right on the beach"], ["جاردن صغيرة", "a small garden"], ["حمام سباحة مشترك", "a shared pool"], ["مفروش بالكامل", "fully furnished"], ["تكييفات", "A/C units"], ["أمن وبوابات", "gated security"]],
    office: [["تكييف مركزي", "central A/C"], ["أسانسير", "an elevator"], ["ريسبشن", "a reception area"], ["غرفة اجتماعات", "a meeting room"], ["إنترنت فايبر", "fiber internet"], ["جراج", "parking"], ["أمن", "security"]],
    land: [["مسجلة", "registered"], ["مرافق قريبة", "utilities nearby"], ["على شارعين", "on two streets"], ["تصلح لعمارة سكنية", "suitable for a residential building"], ["ترخيص مباني", "a building permit"]],
  };

  const OWNERS = ["محمد السيد", "أحمد عبد الرحمن", "محمود حسن", "مصطفى إبراهيم", "علي فتحي", "عمرو سعيد", "خالد نبيل", "طارق شوقي", "ياسر منصور", "هشام فاروق", "إسلام رضا", "شريف عزت", "وليد جمال", "أيمن صلاح", "حسام الدين", "رامي عاطف", "تامر سامي", "سامح وجدي", "ماجد يسري", "عادل زكي", "فاطمة علي", "مريم أحمد", "دينا مصطفى", "رانيا محمود", "هبة سمير", "نورا عادل", "إيمان حسين", "شيماء خالد", "آية طارق", "ريهام فؤاد", "منة الله شريف", "ياسمين رأفت", "عقارات القناة", "بورسعيد هومز", "الدلتا للتسويق العقاري", "مكتب الصفوة العقاري", "شركة النخبة", "المتحدة للاستثمار العقاري"];

  // كام عقار من كل نوع
  const PLAN = [
    ["apartment", "sale", 64], ["apartment", "rent", 46],
    ["villa", "sale", 14], ["villa", "rent", 6],
    ["duplex", "sale", 15], ["duplex", "rent", 7],
    ["chalet", "sale", 8], ["chalet", "rent", 10],
    ["office", "sale", 7], ["office", "rent", 11],
    ["land", "sale", 12],
  ];
  const TYPE_F = { apartment: 1, duplex: 1.05, villa: 1.1, chalet: 1.15, office: 1.3, land: 0.45 };
  const BASE_DAY = Date.UTC(2026, 10, 20); // 20 نوفمبر 2026
  // عشان النقط متقعش في البحر أو القناة
  const LIMIT = { east: { maxLat: 31.2655, maxLng: 32.3075 }, portfouad: { minLng: 32.3175, maxLat: 31.2535 } };

  const ctxList = [];
  PLAN.forEach(([type, purpose, count]) => { for (let i = 0; i < count; i++) ctxList.push({ type, purpose }); });
  // نخلط الترتيب عشان الـ id ميبقاش مرتب بالنوع
  for (let i = ctxList.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ctxList[i], ctxList[j]] = [ctxList[j], ctxList[i]]; }

  ctxList.forEach(({ type, purpose }, i) => {
    const city = weighted(WHERE[type]);
    const area = AREA[city];
    const [spotAr, spotEn] = pick(area.spots);
    const distAr = CITIES[city].ar;
    const distEn = CITIES[city].en;
    const finish = type === "land" ? null : pickFinish();
    const rent = purpose === "rent";
    const furnished = rent && type !== "office" && rnd() < (type === "chalet" ? 0.9 : 0.45);
    const seaView = area.sea && type !== "land" && type !== "office" && rnd() < 0.5;

    // المساحة والغرف
    let size; let beds = 0; let baths = 0;
    if (type === "apartment") {
      size = round(int(75, 220), 5);
      beds = size < 95 ? int(1, 2) : size < 130 ? 2 : size < 170 ? 3 : int(3, 4);
      baths = beds >= 3 ? int(2, 3) : int(1, 2);
    } else if (type === "villa") { size = round(int(250, 550), 10); beds = int(4, 6); baths = int(3, 5); }
    else if (type === "duplex") { size = round(int(180, 340), 10); beds = int(3, 5); baths = int(2, 4); }
    else if (type === "chalet") { size = round(int(60, 140), 5); beds = int(1, 3); baths = beds > 1 ? 2 : 1; }
    else if (type === "office") { size = round(int(50, 250), 5); baths = size > 150 ? int(2, 3) : int(1, 2); }
    else { size = round(int(150, 1200), 25); }

    // السعر
    const m2 = area.m2 * TYPE_F[type] * (finish ? finish.f : 1) * (seaView ? 1.12 : 1) * (0.9 + rnd() * 0.2);
    const salePrice = m2 * size;
    let price;
    if (rent) {
      const factor = type === "chalet" ? 0.0055 : type === "office" ? 0.0042 : 0.0034;
      price = round(salePrice * factor * (furnished ? 1.25 : 1), 500);
    } else {
      price = round(salePrice, salePrice > 5e6 ? 50000 : 10000);
    }
    const yieldPct = rent ? undefined : Math.round((type === "land" ? 7 + rnd() * 4 : 5.5 + rnd() * 4) * 10) / 10;

    // العنوان والوصف
    const floor = type === "apartment" || type === "office" ? FLOORS[int(type === "office" ? 1 : 0, 10)] : null;
    const featPool = type === "villa" || type === "duplex" ? [...FEATURES.villa, ...FEATURES.home] : FEATURES[type === "apartment" ? "home" : type];
    const feats = pickN(featPool, int(2, 4));
    const fAr = feats.map((f) => f[0]).join("، ");
    const fEn = feats.map((f) => f[1]).join(", ");

    // صياغة صح: غرفة / غرفتين / 3 غرف — "في شارع ..." / "قرب ..."
    const roomsAr = (n) => (n === 1 ? "غرفة" : n === 2 ? "غرفتين" : `${n} غرف`);
    const bathsAr = (n) => (n === 1 ? "حمام" : n === 2 ? "حمامين" : `${n} حمامات`);
    const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
    const atAr = spotAr.startsWith("قرب") ? spotAr : `في ${spotAr}`;
    const atEn = spotEn.startsWith("near") ? spotEn : /St\.$/.test(spotEn) ? `on ${spotEn}` : `in ${spotEn}`;
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    const T = {
      apartment: [
        () => ({ ar: `شقة ${roomsAr(beds)} ${finish.ar} في ${distAr}`, en: `${beds}-bedroom ${finish.en} apartment in ${distEn}` }),
        () => ({ ar: `شقة ${size} متر ${seaView ? "بفيو على البحر" : atAr}`, en: `${size} m² apartment ${seaView ? "with sea view" : atEn}` }),
        () => ({ ar: `${furnished ? "شقة مفروشة" : "شقة"} في الدور ${floor[0]} في ${distAr}`, en: `${furnished ? "Furnished apartment" : "Apartment"} on the ${floor[1]} floor in ${distEn}` }),
        () => ({ ar: `${rent ? "شقة للإيجار" : "شقة لقطة"} ${seaView ? "على البحر" : atAr}`, en: `${rent ? "Apartment for rent" : "Great-value apartment"} ${seaView ? "by the sea" : atEn}` }),
      ],
      villa: [
        () => ({ ar: `فيلا مستقلة ${size} متر في ${distAr}`, en: `${size} m² standalone villa in ${distEn}` }),
        () => ({ ar: `فيلا ${roomsAr(beds)} بحديقة خاصة`, en: `${beds}-bedroom villa with a private garden` }),
        () => ({ ar: `فيلا ${finish.ar} ${seaView ? "بفيو على البحر" : atAr}`, en: `${finish.en} villa ${seaView ? "with sea view" : atEn}` }),
      ],
      duplex: [
        () => ({ ar: `دوبلكس ${roomsAr(beds)} بروف خاص`, en: `${beds}-bedroom duplex with a private roof` }),
        () => ({ ar: `دوبلكس ${size} متر في ${distAr}`, en: `${size} m² duplex in ${distEn}` }),
        () => ({ ar: `دوبلكس ${finish.ar} ${seaView ? "بفيو على البحر" : atAr}`, en: `${finish.en} duplex ${seaView ? "with sea view" : atEn}` }),
      ],
      chalet: [
        () => ({ ar: `شاليه ${roomsAr(beds)} على البحر في ${distAr}`, en: `${beds}-bedroom beach chalet in ${distEn}` }),
        () => ({ ar: `شاليه ${furnished ? "مفروش " : ""}${size} متر ${atAr}`, en: `${furnished ? "Furnished " : ""}${size} m² chalet ${atEn}` }),
        () => ({ ar: `شاليه ${rent ? "للإيجار الصيفي" : "للبيع"} بفيو مفتوح`, en: `Chalet ${rent ? "for summer rental" : "for sale"} with an open view` }),
      ],
      office: [
        () => ({ ar: `مكتب إداري ${size} متر في ${distAr}`, en: `${size} m² office in ${distEn}` }),
        () => ({ ar: `مكتب ${finish.ar} ${atAr}`, en: `${finish.en} office ${atEn}` }),
        () => ({ ar: `مقر إداري في الدور ${floor[0]} في ${distAr}`, en: `Office space on the ${floor[1]} floor in ${distEn}` }),
      ],
      land: [
        () => ({ ar: `أرض مباني ${size} متر في ${distAr}`, en: `${size} m² building plot in ${distEn}` }),
        () => ({ ar: `قطعة أرض ${size} متر ${atAr}`, en: `${size} m² land plot ${atEn}` }),
      ],
    };
    const rawTitle = pick(T[type])();
    const title = { ar: rawTitle.ar, en: cap(rawTitle.en) };

    const D = {
      apartment: () => ({
        ar: `شقة ${size} متر، ${roomsAr(beds)} و${bathsAr(baths)}${floor ? `، الدور ${floor[0]}` : ""}، تشطيب ${finish.ar}${furnished ? "، مفروشة بالكامل" : ""}${seaView ? "، وفيو مباشر على البحر" : ""}. فيها ${fAr}.`,
        en: `${size} m² apartment, ${plural(beds, "bedroom")} and ${plural(baths, "bathroom")}${floor ? `, ${floor[1]} floor` : ""}, ${finish.en} finishing${furnished ? ", fully furnished" : ""}${seaView ? ", with a direct sea view" : ""}. Comes with ${fEn}.`,
      }),
      villa: () => ({
        ar: `فيلا ${size} متر، ${roomsAr(beds)} و${bathsAr(baths)}، تشطيب ${finish.ar}${seaView ? "، فيو على البحر" : ""}. فيها ${fAr}، في منطقة هادية ومناسبة للعائلات.`,
        en: `${size} m² villa with ${plural(beds, "bedroom")} and ${plural(baths, "bathroom")}, ${finish.en} finishing${seaView ? ", sea view" : ""}. Includes ${fEn}, in a quiet, family-friendly area.`,
      }),
      duplex: () => ({
        ar: `دوبلكس ${size} متر على دورين، ${roomsAr(beds)} و${bathsAr(baths)}، تشطيب ${finish.ar}. فيه ${fAr}.`,
        en: `${size} m² two-level duplex, ${plural(beds, "bedroom")} and ${plural(baths, "bathroom")}, ${finish.en} finishing. Includes ${fEn}.`,
      }),
      chalet: () => ({
        ar: `شاليه ${size} متر، ${roomsAr(beds)} و${bathsAr(baths)}، ${fAr}. ${rent ? "متاح للإيجار الشهري في الصيف." : "مناسب للمصيف أو الاستثمار."}`,
        en: `${size} m² chalet, ${plural(beds, "bedroom")} and ${plural(baths, "bathroom")}, ${fEn}. ${rent ? "Available for monthly summer rental." : "Great as a summer home or an investment."}`,
      }),
      office: () => ({
        ar: `مكتب ${size} متر، الدور ${floor[0]}، تشطيب ${finish.ar}، ${bathsAr(baths)}. فيه ${fAr}، في منطقة تجارية حيوية.`,
        en: `${size} m² office on the ${floor[1]} floor, ${finish.en} finishing, ${plural(baths, "bathroom")}. Includes ${fEn}, in a busy commercial area.`,
      }),
      land: () => ({
        ar: `أرض ${size} متر في ${distAr} (${spotAr})، ${fAr}. فرصة كويسة للبناء أو الاستثمار.`,
        en: `${size} m² plot in ${distEn} (${spotEn}), ${fEn}. A good opportunity to build or invest.`,
      }),
    };

    const [cLat, cLng] = CITY_CENTERS[city];
    const day = new Date(BASE_DAY - int(0, 120) * 864e5).toISOString().slice(0, 10);

    const listing = {
      id: `g${i + 1}`, purpose, type, city,
      featured: rnd() < 0.04,
      title,
      address: { ar: `${distAr}، ${spotAr}`, en: `${distEn}, ${spotEn}` },
      price, size, beds, baths,
      lat: Math.round(Math.min(cLat + (rnd() - 0.5) * 0.009, LIMIT[city]?.maxLat ?? 90) * 1e4) / 1e4,
      lng: Math.round(Math.min(Math.max(cLng + (rnd() - 0.5) * 0.011, LIMIT[city]?.minLng ?? -180), LIMIT[city]?.maxLng ?? 180) * 1e4) / 1e4,
      images: photos(type),
      desc: D[type](),
      owner: pick(OWNERS),
      phone: `010000${String(100 + i).padStart(5, "0")}`,
      createdAt: day,
    };
    if (rnd() < 0.4) listing.verified = true;
    if (yieldPct !== undefined) listing.yield = yieldPct;
    SEED_LISTINGS.push(listing);
  });
})();

/* =========================================================
   جولة 360° + سجل السعر للعقارات التجريبية
   (صور 360 مجانية CC0 من Poly Haven في assets/360)
   رقم عشوائي منفصل عشان باقي بيانات العقارات متتغيرش
   ========================================================= */
(function addPanoAndHistory() {
  let seed = 3601;
  const rnd = () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const P = (name) => `assets/360/${name}.jpg`;
  const PANOS = {
    apartment: ["lebombo", "small-empty-house", "kiara-interior", "lythwood-room", "hotel-room", "en-suite"],
    villa: ["lythwood-lounge", "entrance-hall", "wooden-lounge", "kiara-interior"],
    duplex: ["lythwood-lounge", "wooden-lounge", "lebombo", "lythwood-room"],
    chalet: ["relax-inn-seaview-suite", "hotel-room"],
    office: ["unfinished-office"],
  };
  // العقارات الأساسية (s1..s9) — صورة مناسبة لكل واحد
  const FIXED = { s1: "lythwood-lounge", s2: "relax-inn-seaview-suite", s3: "hotel-room", s4: "wooden-lounge", s5: "relax-inn-seaview-suite", s6: "unfinished-office", s7: "small-empty-house", s9: "entrance-hall" };
  const TODAY = Date.UTC(2026, 10, 20);
  const DAY = 864e5;
  const roundP = (v, purpose) => (purpose === "rent" ? Math.round(v / 500) * 500 : Math.round(v / (v > 5e6 ? 50000 : 10000)) * (v > 5e6 ? 50000 : 10000));

  SEED_LISTINGS.forEach((l) => {
    // 360°
    if (FIXED[l.id]) l.pano = P(FIXED[l.id]);
    else if (PANOS[l.type] && rnd() < 0.45) l.pano = P(pick(PANOS[l.type]));

    // سجل السعر: من وقت ما اتعرض لحد آخر تغيير (من 1 لـ 5 تغييرات)
    const listed = new Date(`${l.createdAt}T10:00:00Z`).getTime();
    const start = listed - Math.floor(rnd() * 300) * DAY; // ممكن يكون اتعرض قبل كده بسعر تاني
    const changes = Math.floor(rnd() * 5); // 0..4 تغييرات بعد أول سعر
    const points = [{ at: start, price: l.price }];
    let price = l.price;
    // بنمشي لورا من السعر الحالي: الأسعار القديمة غالباً أقل (تضخم)، وأحياناً أعلى (المالك نزّل السعر)
    const back = [];
    for (let i = 0; i < changes; i++) {
      const r = rnd() < 0.3 ? 0.03 + rnd() * 0.07 : -(0.02 + rnd() * 0.08);
      let next = roundP(price * (1 + r), l.purpose);
      if (next === price) next = price + (r > 0 ? 1 : -1) * (l.purpose === "rent" ? 500 : 10000); // تغيير حقيقي مش نفس الرقم
      price = next;
      back.push(price);
    }
    if (changes) {
      const span = Math.max(DAY * 20, TODAY - start - DAY * 3);
      const times = Array.from({ length: changes }, () => start + DAY * 10 + Math.floor(rnd() * (span - DAY * 10)))
        .sort((a, b) => a - b);
      // أقدم سعر = آخر واحد حسبناه، والسعر الحالي = آخر نقطة
      const seq = [...back].reverse();
      points.length = 0;
      points.push({ at: start, price: seq[0] });
      for (let i = 1; i < seq.length; i++) points.push({ at: times[i - 1], price: seq[i] });
      points.push({ at: times[changes - 1], price: l.price });
    }
    l.priceHistory = points.map((p) => ({ price: p.price, at: new Date(p.at).toISOString() }));
  });
})();
