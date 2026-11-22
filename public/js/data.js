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
