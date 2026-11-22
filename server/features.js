// =========================================================
// API الإعلانات والمفضلة والإشعارات والمحادثات والبحث المحفوظ
//
//  GET    /api/listings                كل الإعلانات الحقيقية + حالة الإخفاء/التمييز/التوثيق
//  POST   /api/listings                (بروكر/أدمن) إعلان جديد (صور + صورة 360 اختيارية)
//  PATCH  /api/listings/:id            (صاحب الإعلان/أدمن) تعديل السعر
//  DELETE /api/listings/:id            (صاحب الإعلان/أدمن) حذف
//  GET    /api/media/:id/:slot         صور الإعلان (0..5 أو pano)
//  PATCH  /api/admin/moderation/:id    (أدمن) إخفاء / تمييز / توثيق
//  GET    /api/favorites               مفضلتي
//  POST   /api/favorites/:id           إضافة للمفضلة
//  DELETE /api/favorites/:id           شيل من المفضلة
//  GET    /api/notifications           إشعاراتي + عدد المحادثات اللي فيها رسايل جديدة
//  POST   /api/notifications/read      تعليم إشعار (أو الكل) كمقروء
//  GET    /api/chats                   محادثاتي
//  POST   /api/chats                   ابدأ محادثة مع صاحب إعلان
//  GET    /api/chats/:id/messages      رسايل محادثة (?after=تاريخ لرسايل أحدث بس)
//  POST   /api/chats/:id/messages      ابعت رسالة
//  GET    /api/searches                عمليات البحث المحفوظة
//  POST   /api/searches                احفظ بحث (بيجيلك إشعار لما ينزل عقار مطابق)
//  DELETE /api/searches/:id            امسح بحث محفوظ
// =========================================================
const crypto = require("crypto");

const TYPES = ["apartment", "villa", "duplex", "chalet", "office", "land"];
const CITIES = ["east", "arab", "manakh", "zohour", "dawahy", "south", "west", "portfouad"];
const SEED_RE = /^[sg]\d{1,4}$/; // العقارات التجريبية (موجودة في كود الموقع مش في قاعدة البيانات)
const IMG_RE = /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=]+)$/i;
const MAX_IMAGES = 6;
const MAX_IMAGE_CHARS = 420 * 1024;     // ~300 KB لكل صورة
const MAX_PANO_CHARS = 2700 * 1024;     // ~2 MB لصورة الـ 360
const MAX_SEARCHES = 10;

const newId = (p) => `${p}_${Date.now().toString(36)}${crypto.randomBytes(4).toString("hex")}`;
const now = () => new Date().toISOString();

/* ---------- مدى تطابق العقار مع تفضيلات المستخدم (نفس اللي في الموقع) ---------- */
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

/* ---------- هل العقار مطابق لبحث محفوظ؟ ---------- */
function matchesSearch(l, c) {
  if ((c.mode === "rent" ? "rent" : "sale") !== l.purpose) return false;
  if (c.city && l.city !== c.city) return false;
  if (c.type && l.type !== c.type) return false;
  if (c.min && l.price < c.min) return false;
  if (c.max && l.price > c.max) return false;
  if (c.beds && (l.beds || 0) < c.beds) return false;
  if (c.pano && !l.has_pano) return false;
  if (c.q) {
    const hay = `${l.title} ${l.address || ""}`.toLowerCase();
    if (!hay.includes(String(c.q).toLowerCase())) return false;
  }
  return true;
}

module.exports = function features(h) {
  const { fail, requireUser, str, limit } = h;

  /* ---------- مساعدات ---------- */
  async function notify(store, userId, kind, vars = {}, listingId = null) {
    if (!userId) return;
    await store.insert("notifications", {
      id: newId("n"), user_id: userId, kind, vars, listing_id: listingId, is_read: false, created_at: now(),
    });
  }

  function publicListing(l, history = []) {
    const v = encodeURIComponent(l.media_v || "1");
    const out = {
      id: l.id, purpose: l.purpose, type: l.type, city: l.city,
      title: l.title, address: l.address || "", desc: l.description || "",
      price: l.price, size: l.size, beds: l.beds || 0, baths: l.baths || 0,
      phone: l.phone || "", owner: l.owner_name || "", ownerId: l.owner_id,
      images: Array.from({ length: l.images || 0 }, (_, i) => `/api/media/${l.id}/${i}?v=${v}`),
      createdAt: l.created_at,
      priceHistory: history.map((x) => ({ price: x.price, at: x.created_at })),
    };
    if (l.has_pano) out.pano = `/api/media/${l.id}/pano?v=${v}`;
    if (l.lat != null && l.lng != null) { out.lat = l.lat; out.lng = l.lng; }
    return out;
  }

  const int = (v, min, max, key) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max) fail(400, key);
    return Math.round(n);
  };
  function cleanListing(b) {
    const purpose = b.purpose === "rent" ? "rent" : b.purpose === "sale" ? "sale" : fail(400, "err_required");
    if (!TYPES.includes(b.type) || !CITIES.includes(b.city)) fail(400, "err_required");
    const title = str(b.title, 90);
    const address = str(b.address, 120);
    if (title.length < 3 || address.length < 3) fail(400, "err_required");
    const phone = String(b.phone || "").replace(/[\s-]/g, "");
    if (!/^\+?\d{8,14}$/.test(phone)) fail(400, "err_phone");
    const out = {
      purpose, type: b.type, city: b.city, title, address,
      price: int(b.price, 1, 1e10, "err_required"),
      size: int(b.size, 1, 100000, "err_required"),
      beds: int(b.beds || 0, 0, 20, "err_required"),
      baths: int(b.baths || 0, 0, 20, "err_required"),
      description: str(b.desc, 1500),
      phone,
      lat: null, lng: null,
    };
    const lat = Number(b.lat); const lng = Number(b.lng);
    if (b.lat != null && b.lng != null && lat > 31.0 && lat < 31.5 && lng > 32.0 && lng < 32.6) { out.lat = lat; out.lng = lng; }
    return out;
  }
  function cleanImage(v, maxChars) {
    if (typeof v !== "string" || v.length > maxChars) fail(400, "err_image_big");
    const m = v.match(IMG_RE);
    if (!m) fail(400, "err_generic");
    return { mime: m[1].toLowerCase(), data: m[2] };
  }
  // العقار موجود؟ (تجريبي أو حقيقي)
  async function listingExists(store, id) {
    if (typeof id !== "string" || id.length > 60) return null;
    if (SEED_RE.test(id)) return { seed: true };
    const l = await store.get("listings", { id });
    return l ? { seed: false, listing: l } : null;
  }
  async function ownListing(store, me, id) {
    const l = await store.get("listings", { id });
    if (!l) fail(404, "err_not_found");
    if (l.owner_id !== me.id && me.role !== "admin") fail(403, "err_forbidden");
    return l;
  }
  async function removeListing(store, id) {
    await Promise.all([
      store.remove("listings", { id }),
      store.remove("listing_media", { listing_id: id }),
      store.remove("price_history", { listing_id: id }),
      store.remove("favorites", { listing_id: id }),
      store.remove("moderation", { listing_id: id }),
    ]);
  }
  // عقار جديد → بلّغ اللي عندهم بحث محفوظ مطابق، وبعدهم اللي تفضيلاتهم مطابقة
  async function alertMatches(store, l) {
    const [users, searches] = await Promise.all([store.listUsers(), store.find("saved_searches")]);
    const done = new Set([l.owner_id]);
    const vars = { title: l.title, area: l.city, price: l.price, purpose: l.purpose };
    for (const s of searches) {
      if (done.has(s.user_id) || !matchesSearch(l, s.criteria || {})) continue;
      done.add(s.user_id);
      await notify(store, s.user_id, "search_match", { ...vars, name: s.name }, l.id);
    }
    for (const u of users) {
      if (done.has(u.id) || !u.prefs || matchScore(l, u.prefs) < 0.75) continue;
      done.add(u.id);
      await notify(store, u.id, "match", vars, l.id);
    }
  }

  const publicNotif = (n) => ({ id: n.id, kind: n.kind, vars: n.vars || {}, listingId: n.listing_id, read: !!n.is_read, createdAt: n.created_at });

  function publicChat(c, me) {
    const buyer = c.buyer_id === me.id;
    const readAt = buyer ? c.buyer_read_at : c.seller_read_at;
    return {
      id: c.id, listingId: c.listing_id, listingTitle: c.listing_title,
      role: buyer ? "buyer" : "seller",
      other: { id: buyer ? c.seller_id : c.buyer_id, name: buyer ? c.seller_name : c.buyer_name },
      lastBody: c.last_body || "", lastAt: c.last_at || c.created_at, lastMine: c.last_sender === me.id,
      unread: !!c.last_at && c.last_sender !== me.id && (!readAt || readAt < c.last_at),
    };
  }
  async function myChats(store, me) {
    const [a, b] = await Promise.all([
      store.find("conversations", { buyer_id: me.id }),
      store.find("conversations", { seller_id: me.id }),
    ]);
    return [...a, ...b];
  }
  async function chatFor(store, me, id) {
    const c = await store.get("conversations", { id });
    if (!c || (c.buyer_id !== me.id && c.seller_id !== me.id)) fail(404, "err_not_found");
    return c;
  }
  const publicMsg = (m, me) => ({ id: m.id, body: m.body, mine: m.sender_id === me.id, createdAt: m.created_at });

  function cleanCriteria(c) {
    if (!c || typeof c !== "object") fail(400, "err_generic");
    const num = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n > 0 ? n : 0; };
    return {
      mode: c.mode === "rent" ? "rent" : "buy",
      city: CITIES.includes(c.city) ? c.city : "",
      type: TYPES.includes(c.type) ? c.type : "",
      min: num(c.min), max: num(c.max),
      beds: Math.min(10, num(c.beds)),
      q: str(c.q, 60),
      pano: !!c.pano,
    };
  }
  const publicSearch = (s) => ({ id: s.id, name: s.name, criteria: s.criteria || {}, createdAt: s.created_at });

  /* =========================================================
     الـ Routes
     ========================================================= */
  const routes = {
    /* ----- الإعلانات ----- */
    async "GET /api/listings"({ req, store }) {
      const me = await requireUser(req, store);
      const [rows, mods, hist] = await Promise.all([
        store.find("listings", {}, { order: "created_at DESC" }),
        store.find("moderation"),
        store.find("price_history", {}, { order: "created_at ASC" }),
      ]);
      const moderation = {};
      mods.forEach((m) => {
        const x = {};
        ["hidden", "featured", "verified"].forEach((k) => { if (m[k] != null) x[k] = !!m[k]; });
        moderation[m.listing_id] = x;
      });
      const byListing = {};
      hist.forEach((x) => { (byListing[x.listing_id] = byListing[x.listing_id] || []).push(x); });
      const visible = rows.filter((l) => me.role === "admin" || l.owner_id === me.id || !(moderation[l.id] && moderation[l.id].hidden));
      return { listings: visible.map((l) => publicListing(l, byListing[l.id])), moderation };
    },

    async "POST /api/listings"({ req, body, store }) {
      const me = await requireUser(req, store);
      if (!["broker", "admin"].includes(me.role)) fail(403, "err_forbidden");
      limit(`listing:${me.id}`, 30, 60 * 60 * 1000);
      const fields = cleanListing(body);
      const images = (Array.isArray(body.images) ? body.images : []).slice(0, MAX_IMAGES).map((x) => cleanImage(x, MAX_IMAGE_CHARS));
      const pano = body.pano ? cleanImage(body.pano, MAX_PANO_CHARS) : null;
      const id = newId("l");
      const t = now();
      const row = await store.insert("listings", {
        id, owner_id: me.id, owner_name: me.name, ...fields,
        images: images.length, has_pano: !!pano, media_v: Date.now().toString(36),
        created_at: t, updated_at: t,
      });
      for (let i = 0; i < images.length; i++) await store.insert("listing_media", { listing_id: id, slot: String(i), ...images[i] });
      if (pano) await store.insert("listing_media", { listing_id: id, slot: "pano", ...pano });
      const hrow = await store.insert("price_history", { id: newId("p"), listing_id: id, price: fields.price, created_at: t });
      await notify(store, me.id, "published", { title: row.title }, id);
      await alertMatches(store, row);
      return { status: 201, data: { listing: publicListing(row, [hrow]) } };
    },

    async "PATCH /api/listings/:id"({ req, body, store, params }) {
      const me = await requireUser(req, store);
      const l = await ownListing(store, me, params.id);
      if (!("price" in body)) fail(400, "err_generic");
      const price = int(body.price, 1, 1e10, "err_required");
      if (price !== l.price) {
        const t = now();
        await store.update("listings", { id: l.id }, { price, updated_at: t });
        await store.insert("price_history", { id: newId("p"), listing_id: l.id, price, created_at: t });
        // اللي حافظين العقار في المفضلة يعرفوا إن السعر نزل
        if (price < l.price) {
          const favs = await store.find("favorites", { listing_id: l.id });
          for (const f of favs) {
            if (f.user_id !== l.owner_id) await notify(store, f.user_id, "price_drop", { title: l.title, price, purpose: l.purpose, old: l.price }, l.id);
          }
        }
      }
      const fresh = await store.get("listings", { id: l.id });
      const hist = await store.find("price_history", { listing_id: l.id }, { order: "created_at ASC" });
      return { listing: publicListing(fresh, hist) };
    },

    async "DELETE /api/listings/:id"({ req, store, params }) {
      const me = await requireUser(req, store);
      const l = await ownListing(store, me, params.id);
      await removeListing(store, l.id);
      return { ok: true };
    },

    async "GET /api/media/:id/:slot"({ store, params }) {
      if (!/^(?:[0-5]|pano)$/.test(params.slot)) fail(404, "err_not_found");
      const m = await store.get("listing_media", { listing_id: params.id, slot: params.slot });
      if (!m) fail(404, "err_not_found");
      return { raw: Buffer.from(m.data, "base64"), type: m.mime, cache: "public, max-age=31536000, s-maxage=31536000, immutable" };
    },

    /* ----- الإخفاء / التمييز / التوثيق (أدمن) ----- */
    async "PATCH /api/admin/moderation/:id"({ req, body, store, params }) {
      const me = await requireUser(req, store);
      if (me.role !== "admin") fail(403, "err_forbidden");
      const found = await listingExists(store, params.id);
      if (!found) fail(404, "err_not_found");
      const cur = (await store.get("moderation", { listing_id: params.id })) || {};
      const patch = {};
      ["hidden", "featured", "verified"].forEach((k) => { if (typeof body[k] === "boolean") patch[k] = body[k]; });
      if (!Object.keys(patch).length) fail(400, "err_generic");
      await store.upsert("moderation", {
        listing_id: params.id,
        hidden: "hidden" in patch ? patch.hidden : cur.hidden ?? null,
        featured: "featured" in patch ? patch.featured : cur.featured ?? null,
        verified: "verified" in patch ? patch.verified : cur.verified ?? null,
      });
      // صاحب الإعلان (لو حقيقي) يعرف
      if (!found.seed) {
        const l = found.listing;
        const kinds = [];
        if (patch.verified === true && !cur.verified) kinds.push("verified");
        if (patch.featured === true && !cur.featured) kinds.push("featured");
        if ("hidden" in patch && patch.hidden !== !!cur.hidden) kinds.push(patch.hidden ? "hidden" : "shown");
        for (const k of kinds) await notify(store, l.owner_id, k, { title: l.title }, l.id);
      }
      return { ok: true };
    },

    /* ----- المفضلة ----- */
    async "GET /api/favorites"({ req, store }) {
      const me = await requireUser(req, store);
      const rows = await store.find("favorites", { user_id: me.id }, { order: "created_at ASC" });
      return { ids: rows.map((r) => r.listing_id) };
    },
    async "POST /api/favorites/:id"({ req, store, params }) {
      const me = await requireUser(req, store);
      limit(`fav:${me.id}`, 120, 60 * 1000);
      const found = await listingExists(store, params.id);
      if (!found) fail(404, "err_not_found");
      const had = await store.get("favorites", { user_id: me.id, listing_id: params.id });
      if (!had) {
        await store.upsert("favorites", { user_id: me.id, listing_id: params.id, created_at: now() });
        if (!found.seed && found.listing.owner_id !== me.id) {
          await notify(store, found.listing.owner_id, "fav", { title: found.listing.title }, params.id);
        }
      }
      return { ok: true };
    },
    async "DELETE /api/favorites/:id"({ req, store, params }) {
      const me = await requireUser(req, store);
      await store.remove("favorites", { user_id: me.id, listing_id: params.id });
      return { ok: true };
    },

    /* ----- الإشعارات ----- */
    async "GET /api/notifications"({ req, store }) {
      const me = await requireUser(req, store);
      const [list, unread, chats] = await Promise.all([
        store.find("notifications", { user_id: me.id }, { order: "created_at DESC", limit: 50 }),
        store.find("notifications", { user_id: me.id, is_read: false }),
        myChats(store, me),
      ]);
      return {
        notifications: list.map(publicNotif),
        unread: unread.length,
        chatsUnread: chats.map((c) => publicChat(c, me)).filter((c) => c.unread).length,
      };
    },
    async "POST /api/notifications/read"({ req, body, store }) {
      const me = await requireUser(req, store);
      if (body.id) await store.update("notifications", { id: String(body.id), user_id: me.id }, { is_read: true });
      else await store.update("notifications", { user_id: me.id, is_read: false }, { is_read: true });
      return { ok: true };
    },

    /* ----- المحادثات ----- */
    async "GET /api/chats"({ req, store }) {
      const me = await requireUser(req, store);
      const list = (await myChats(store, me)).map((c) => publicChat(c, me))
        .sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)));
      return { chats: list };
    },
    async "POST /api/chats"({ req, body, store }) {
      const me = await requireUser(req, store);
      limit(`chatnew:${me.id}`, 30, 60 * 60 * 1000);
      const id = String(body.listingId || "");
      if (SEED_RE.test(id)) fail(400, "err_chat_demo");
      const l = await store.get("listings", { id });
      if (!l) fail(404, "err_not_found");
      if (l.owner_id === me.id) fail(400, "err_chat_self");
      let c = await store.get("conversations", { listing_id: l.id, buyer_id: me.id });
      if (!c) {
        const seller = await store.getUserById(l.owner_id);
        if (!seller) fail(404, "err_not_found");
        c = await store.insert("conversations", {
          id: newId("c"), listing_id: l.id, listing_title: l.title,
          buyer_id: me.id, seller_id: seller.id, buyer_name: me.name, seller_name: seller.name,
          last_body: null, last_sender: null, last_at: null, buyer_read_at: now(), seller_read_at: null, created_at: now(),
        });
      }
      return { chat: publicChat(c, me) };
    },
    async "GET /api/chats/:id/messages"({ req, store, params, query }) {
      const me = await requireUser(req, store);
      const c = await chatFor(store, me, params.id);
      const after = query.get("after");
      let msgs = await store.find("messages", { conversation_id: c.id }, { order: "created_at ASC" });
      if (after) msgs = msgs.filter((m) => m.created_at > after);
      else msgs = msgs.slice(-200);
      // اتقرت (بنكتب في قاعدة البيانات بس لو فيه رسايل جديدة فعلاً)
      let fresh = c;
      if (publicChat(c, me).unread) {
        const readKey = c.buyer_id === me.id ? "buyer_read_at" : "seller_read_at";
        fresh = (await store.update("conversations", { id: c.id }, { [readKey]: now() }))[0] || c;
      }
      return { chat: publicChat(fresh, me), messages: msgs.map((m) => publicMsg(m, me)) };
    },
    async "POST /api/chats/:id/messages"({ req, body, store, params }) {
      const me = await requireUser(req, store);
      limit(`msg:${me.id}`, 40, 60 * 1000);
      const c = await chatFor(store, me, params.id);
      const text = str(body.body, 2000);
      if (!text) fail(400, "err_msg_empty");
      const t = now();
      const m = await store.insert("messages", { id: newId("m"), conversation_id: c.id, sender_id: me.id, body: text, created_at: t });
      const readKey = c.buyer_id === me.id ? "buyer_read_at" : "seller_read_at";
      await store.update("conversations", { id: c.id }, { last_body: text.slice(0, 200), last_sender: me.id, last_at: t, [readKey]: t });
      return { status: 201, data: { message: publicMsg(m, me) } };
    },

    /* ----- البحث المحفوظ ----- */
    async "GET /api/searches"({ req, store }) {
      const me = await requireUser(req, store);
      const rows = await store.find("saved_searches", { user_id: me.id }, { order: "created_at DESC" });
      return { searches: rows.map(publicSearch) };
    },
    async "POST /api/searches"({ req, body, store }) {
      const me = await requireUser(req, store);
      const existing = await store.find("saved_searches", { user_id: me.id });
      if (existing.length >= MAX_SEARCHES) fail(400, "err_search_max");
      const criteria = cleanCriteria(body.criteria);
      const name = str(body.name, 60) || "—";
      const row = await store.insert("saved_searches", { id: newId("q"), user_id: me.id, name, criteria, created_at: now() });
      return { status: 201, data: { search: publicSearch(row) } };
    },
    async "DELETE /api/searches/:id"({ req, store, params }) {
      const me = await requireUser(req, store);
      await store.remove("saved_searches", { id: params.id, user_id: me.id });
      return { ok: true };
    },
  };

  /* ---------- أحداث من باقي الـ API (الحسابات) ---------- */
  const hooks = {
    async onRegister(store, user) {
      await notify(store, user.id, "welcome");
      await notify(store, user.id, "prefs_tip");
    },
    async onPassword(store, user) { await notify(store, user.id, "password"); },
    async onRole(store, userId, role) { await notify(store, userId, "role", { role }); },
    async onPrefs(store, userId) { await store.remove("notifications", { user_id: userId, kind: "prefs_tip" }); },
    async onName(store, userId, name) {
      await store.update("listings", { owner_id: userId }, { owner_name: name });
      await store.update("conversations", { buyer_id: userId }, { buyer_name: name });
      await store.update("conversations", { seller_id: userId }, { seller_name: name });
    },
    // حذف الحساب: إعلاناته ومفضلته وإشعاراته ومحادثاته وبحثه المحفوظ
    async purgeUser(store, userId) {
      const mine = await store.find("listings", { owner_id: userId });
      for (const l of mine) await removeListing(store, l.id);
      const chats = [
        ...(await store.find("conversations", { buyer_id: userId })),
        ...(await store.find("conversations", { seller_id: userId })),
      ];
      for (const c of chats) {
        await store.remove("messages", { conversation_id: c.id });
        await store.remove("conversations", { id: c.id });
      }
      await Promise.all([
        store.remove("favorites", { user_id: userId }),
        store.remove("notifications", { user_id: userId }),
        store.remove("saved_searches", { user_id: userId }),
      ]);
    },
  };

  return { routes, hooks };
};

module.exports.matchesSearch = matchesSearch;
module.exports.matchScore = matchScore;
