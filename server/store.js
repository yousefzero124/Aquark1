// =========================================================
// قاعدة البيانات
// - على Vercel: Postgres (Neon) — بيتفعّل لوحده لما يبقى فيه DATABASE_URL
// - على جهازك: ملف data/db.json (للتجربة بس — مش بيترفع على GitHub)
// باقي الكود بيتعامل مع نفس الدوال في الحالتين.
//
// فيه نوعين دوال:
//  1) دوال الحسابات (getUserById, createUser, ...)
//  2) دوال عامة لباقي الجداول: insert / upsert / update / remove / find / get
//     (الشروط مساواة بس: { user_id: "u_1" })
// =========================================================
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.AQARAK_DATA_DIR || path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

// الحقول اللي ينفع تتعدّل في الحساب بعد إنشائه
const UPDATABLE = ["name", "role", "provider", "picture", "phone", "age", "gender", "city", "address", "prefs", "pass_hash", "google_sub"];

/* ---------- باقي الجداول ---------- */
const TABLES = {
  listings: {
    pk: ["id"], index: ["owner_id"],
    cols: {
      id: "TEXT", owner_id: "TEXT NOT NULL", owner_name: "TEXT", purpose: "TEXT NOT NULL", type: "TEXT NOT NULL",
      city: "TEXT NOT NULL", title: "TEXT NOT NULL", address: "TEXT", price: "BIGINT NOT NULL", size: "INT NOT NULL",
      beds: "INT", baths: "INT", description: "TEXT", phone: "TEXT", lat: "DOUBLE PRECISION", lng: "DOUBLE PRECISION",
      images: "INT", has_pano: "BOOLEAN", media_v: "TEXT", created_at: "TIMESTAMPTZ", updated_at: "TIMESTAMPTZ",
    },
  },
  // الصور نفسها (base64) — بتتعرض من /api/media/:id/:slot
  listing_media: { pk: ["listing_id", "slot"], cols: { listing_id: "TEXT", slot: "TEXT", mime: "TEXT", data: "TEXT" } },
  price_history: { pk: ["id"], index: ["listing_id"], cols: { id: "TEXT", listing_id: "TEXT NOT NULL", price: "BIGINT NOT NULL", created_at: "TIMESTAMPTZ" } },
  // إخفاء / تمييز / توثيق (للعقارات التجريبية والحقيقية)
  moderation: { pk: ["listing_id"], cols: { listing_id: "TEXT", hidden: "BOOLEAN", featured: "BOOLEAN", verified: "BOOLEAN" } },
  favorites: { pk: ["user_id", "listing_id"], index: ["listing_id"], cols: { user_id: "TEXT", listing_id: "TEXT", created_at: "TIMESTAMPTZ" } },
  notifications: {
    pk: ["id"], index: ["user_id"],
    cols: { id: "TEXT", user_id: "TEXT NOT NULL", kind: "TEXT NOT NULL", vars: "JSONB", listing_id: "TEXT", is_read: "BOOLEAN", created_at: "TIMESTAMPTZ" },
  },
  conversations: {
    pk: ["id"], index: ["buyer_id", "seller_id"],
    cols: {
      id: "TEXT", listing_id: "TEXT NOT NULL", listing_title: "JSONB", buyer_id: "TEXT NOT NULL", seller_id: "TEXT NOT NULL",
      buyer_name: "TEXT", seller_name: "TEXT", last_body: "TEXT", last_sender: "TEXT", last_at: "TIMESTAMPTZ",
      buyer_read_at: "TIMESTAMPTZ", seller_read_at: "TIMESTAMPTZ", created_at: "TIMESTAMPTZ",
    },
  },
  messages: { pk: ["id"], index: ["conversation_id"], cols: { id: "TEXT", conversation_id: "TEXT NOT NULL", sender_id: "TEXT NOT NULL", body: "TEXT NOT NULL", created_at: "TIMESTAMPTZ" } },
  saved_searches: { pk: ["id"], index: ["user_id"], cols: { id: "TEXT", user_id: "TEXT NOT NULL", name: "TEXT", criteria: "JSONB", created_at: "TIMESTAMPTZ" } },
};

function spec(table) {
  const s = TABLES[table];
  if (!s) throw new Error(`Unknown table ${table}`);
  return s;
}
function checkCols(table, obj) {
  const cols = spec(table).cols;
  Object.keys(obj).forEach((k) => { if (!(k in cols)) throw new Error(`Unknown column ${table}.${k}`); });
}
// ترتيب: "created_at DESC"
function parseOrder(table, order) {
  if (!order) return null;
  const [col, dir = "ASC"] = order.split(" ");
  if (!(col in spec(table).cols) || !/^(ASC|DESC)$/i.test(dir)) throw new Error(`Bad order ${order}`);
  return { col, desc: /^desc$/i.test(dir) };
}
const isTime = (type) => type.startsWith("TIMESTAMPTZ");
const isInt = (type) => /^(INT|BIGINT)/.test(type);
// توحيد شكل القيم اللي راجعة من قاعدة البيانات (أرقام، تواريخ ISO)
function normalize(table, row) {
  if (!row) return null;
  const cols = spec(table).cols;
  const out = { ...row };
  for (const [k, type] of Object.entries(cols)) {
    if (out[k] == null) continue;
    if (isTime(type)) out[k] = new Date(out[k]).toISOString();
    else if (isInt(type)) out[k] = Number(out[k]);
    else if (type.startsWith("DOUBLE")) out[k] = Number(out[k]);
  }
  return out;
}

function configError() {
  const e = new Error("err_not_configured");
  e.status = 500;
  return e;
}

/* =========================================================
   ملف محلي (للتجربة على الجهاز)
   ========================================================= */
function fileStore() {
  const load = () => {
    let db;
    try { db = JSON.parse(fs.readFileSync(DB_FILE, "utf8")); } catch (e) { db = {}; }
    db.users = db.users || [];
    db.resets = db.resets || [];
    db.tables = db.tables || {};
    Object.keys(TABLES).forEach((t) => { db.tables[t] = db.tables[t] || []; });
    return db;
  };
  const save = (db) => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  };
  const now = () => new Date().toISOString();
  const matches = (row, where) => Object.entries(where).every(([k, v]) => row[k] === v);
  const sameKey = (table, a, b) => spec(table).pk.every((k) => a[k] === b[k]);

  return {
    kind: "file",
    /* --- الحسابات --- */
    async getUserById(id) { return load().users.find((u) => u.id === id) || null; },
    async getUserByEmail(email) { return load().users.find((u) => u.email === email) || null; },
    async getUserByGoogleSub(sub) { return load().users.find((u) => u.google_sub && u.google_sub === sub) || null; },
    async createUser(u) {
      const db = load();
      if (db.users.some((x) => x.email === u.email)) throw Object.assign(new Error("err_exists"), { status: 409 });
      const row = { ...u, created_at: now(), updated_at: now() };
      db.users.push(row);
      save(db);
      return row;
    },
    async updateUser(id, patch) {
      const db = load();
      const u = db.users.find((x) => x.id === id);
      if (!u) return null;
      UPDATABLE.forEach((k) => { if (k in patch) u[k] = patch[k]; });
      u.updated_at = now();
      save(db);
      return u;
    },
    async deleteUser(id) {
      const db = load();
      const u = db.users.find((x) => x.id === id);
      db.users = db.users.filter((x) => x.id !== id);
      if (u) db.resets = db.resets.filter((r) => r.email !== u.email);
      save(db);
    },
    async listUsers() {
      return load().users.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    },
    async saveReset(email, codeHash, expiresAt) {
      const db = load();
      db.resets = db.resets.filter((r) => r.email !== email);
      db.resets.push({ email, code_hash: codeHash, expires_at: expiresAt, attempts: 0 });
      save(db);
    },
    async getReset(email) { return load().resets.find((r) => r.email === email) || null; },
    async bumpResetAttempts(email) {
      const db = load();
      const r = db.resets.find((x) => x.email === email);
      if (r) { r.attempts += 1; save(db); }
    },
    async deleteReset(email) {
      const db = load();
      db.resets = db.resets.filter((r) => r.email !== email);
      save(db);
    },

    /* --- دوال عامة --- */
    async insert(table, row) {
      checkCols(table, row);
      const db = load();
      if (db.tables[table].some((r) => sameKey(table, r, row))) throw Object.assign(new Error("err_exists"), { status: 409 });
      db.tables[table].push({ ...row });
      save(db);
      return normalize(table, row);
    },
    async upsert(table, row) {
      checkCols(table, row);
      const db = load();
      const i = db.tables[table].findIndex((r) => sameKey(table, r, row));
      if (i >= 0) db.tables[table][i] = { ...db.tables[table][i], ...row };
      else db.tables[table].push({ ...row });
      save(db);
      return normalize(table, i >= 0 ? db.tables[table][i] : row);
    },
    async update(table, where, patch) {
      checkCols(table, where); checkCols(table, patch);
      const db = load();
      const rows = db.tables[table].filter((r) => matches(r, where));
      rows.forEach((r) => Object.assign(r, patch));
      if (rows.length) save(db);
      return rows.map((r) => normalize(table, r));
    },
    async remove(table, where) {
      checkCols(table, where);
      const db = load();
      const before = db.tables[table].length;
      db.tables[table] = db.tables[table].filter((r) => !matches(r, where));
      if (db.tables[table].length !== before) save(db);
      return before - db.tables[table].length;
    },
    async find(table, where = {}, { order, limit } = {}) {
      checkCols(table, where);
      const o = parseOrder(table, order);
      let rows = load().tables[table].filter((r) => matches(r, where));
      if (o) {
        rows.sort((a, b) => {
          const x = a[o.col]; const y = b[o.col];
          const c = typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""));
          return o.desc ? -c : c;
        });
      }
      if (limit) rows = rows.slice(0, limit);
      return rows.map((r) => normalize(table, r));
    },
    async get(table, where) { return (await this.find(table, where, { limit: 1 }))[0] || null; },
  };
}

/* =========================================================
   Postgres (على Vercel)
   q(text, params) → مصفوفة صفوف
   ========================================================= */
async function buildPg(q) {
  // الجداول بتتعمل لوحدها أول مرة (سؤال واحد بس لو كانت موجودة)
  const probe = await q("SELECT to_regclass('public.saved_searches') AS t");
  if (!probe[0] || !probe[0].t) {
    await q(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'password',
      picture TEXT,
      phone TEXT,
      age INT,
      gender TEXT,
      city TEXT,
      address TEXT,
      prefs JSONB,
      pass_hash TEXT,
      google_sub TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    await q(`CREATE TABLE IF NOT EXISTS password_resets (
      email TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INT NOT NULL DEFAULT 0
    )`);
    for (const [table, s] of Object.entries(TABLES)) {
      const cols = Object.entries(s.cols).map(([k, type]) => `${k} ${type}`).join(", ");
      await q(`CREATE TABLE IF NOT EXISTS ${table} (${cols}, PRIMARY KEY (${s.pk.join(", ")}))`);
      for (const col of s.index || []) await q(`CREATE INDEX IF NOT EXISTS ${table}_${col}_idx ON ${table} (${col})`);
    }
  }

  const iso = (v) => (v ? new Date(v).toISOString() : v);
  const userRow = (r) => (r ? { ...r, created_at: iso(r.created_at), updated_at: iso(r.updated_at) } : null);
  const firstUser = async (text, params) => userRow((await q(text, params))[0]);
  // JSONB بيتبعت كنص
  const enc = (table, k, v) => (v != null && spec(table).cols[k] === "JSONB" ? JSON.stringify(v) : v);
  const whereSql = (table, where, start = 1) => {
    const keys = Object.keys(where);
    return {
      sql: keys.length ? ` WHERE ${keys.map((k, i) => `${k} = $${start + i}`).join(" AND ")}` : "",
      vals: keys.map((k) => enc(table, k, where[k])),
    };
  };

  return {
    kind: "postgres",
    /* --- الحسابات --- */
    getUserById: (id) => firstUser("SELECT * FROM users WHERE id = $1", [id]),
    getUserByEmail: (email) => firstUser("SELECT * FROM users WHERE email = $1", [email]),
    getUserByGoogleSub: (sub) => firstUser("SELECT * FROM users WHERE google_sub = $1", [sub]),
    async createUser(u) {
      try {
        return await firstUser(
          `INSERT INTO users (id, name, email, role, provider, picture, phone, age, gender, city, address, prefs, pass_hash, google_sub)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
          [u.id, u.name, u.email, u.role, u.provider, u.picture || null, u.phone || null, u.age || null, u.gender || null,
            u.city || null, u.address || null, u.prefs ? JSON.stringify(u.prefs) : null, u.pass_hash || null, u.google_sub || null]
        );
      } catch (e) {
        if (e.code === "23505") throw Object.assign(new Error("err_exists"), { status: 409 });
        throw e;
      }
    },
    async updateUser(id, patch) {
      const keys = UPDATABLE.filter((k) => k in patch);
      if (!keys.length) return this.getUserById(id);
      const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
      const vals = keys.map((k) => (k === "prefs" && patch[k] != null ? JSON.stringify(patch[k]) : patch[k]));
      return firstUser(`UPDATE users SET ${sets}, updated_at = now() WHERE id = $1 RETURNING *`, [id, ...vals]);
    },
    async deleteUser(id) {
      const u = await this.getUserById(id);
      await q("DELETE FROM users WHERE id = $1", [id]);
      if (u) await q("DELETE FROM password_resets WHERE email = $1", [u.email]);
    },
    async listUsers() { return (await q("SELECT * FROM users ORDER BY created_at DESC")).map(userRow); },
    async saveReset(email, codeHash, expiresAt) {
      await q(`INSERT INTO password_resets (email, code_hash, expires_at, attempts) VALUES ($1,$2,$3,0)
               ON CONFLICT (email) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0`,
      [email, codeHash, expiresAt]);
    },
    async getReset(email) {
      const r = (await q("SELECT * FROM password_resets WHERE email = $1", [email]))[0];
      return r ? { ...r, expires_at: iso(r.expires_at) } : null;
    },
    async bumpResetAttempts(email) { await q("UPDATE password_resets SET attempts = attempts + 1 WHERE email = $1", [email]); },
    async deleteReset(email) { await q("DELETE FROM password_resets WHERE email = $1", [email]); },

    /* --- دوال عامة --- */
    async insert(table, row) {
      checkCols(table, row);
      const keys = Object.keys(row);
      try {
        const r = await q(
          `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING *`,
          keys.map((k) => enc(table, k, row[k]))
        );
        return normalize(table, r[0]);
      } catch (e) {
        if (e.code === "23505") throw Object.assign(new Error("err_exists"), { status: 409 });
        throw e;
      }
    },
    async upsert(table, row) {
      checkCols(table, row);
      const keys = Object.keys(row);
      const pk = spec(table).pk;
      const rest = keys.filter((k) => !pk.includes(k));
      const conflict = rest.length ? `DO UPDATE SET ${rest.map((k) => `${k} = EXCLUDED.${k}`).join(", ")}` : "DO NOTHING";
      const r = await q(
        `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(", ")})
         ON CONFLICT (${pk.join(", ")}) ${conflict} RETURNING *`,
        keys.map((k) => enc(table, k, row[k]))
      );
      return normalize(table, r[0] || row);
    },
    async update(table, where, patch) {
      checkCols(table, where); checkCols(table, patch);
      const keys = Object.keys(patch);
      if (!keys.length) return [];
      const w = whereSql(table, where, keys.length + 1);
      const r = await q(
        `UPDATE ${table} SET ${keys.map((k, i) => `${k} = $${i + 1}`).join(", ")}${w.sql} RETURNING *`,
        [...keys.map((k) => enc(table, k, patch[k])), ...w.vals]
      );
      return r.map((x) => normalize(table, x));
    },
    async remove(table, where) {
      checkCols(table, where);
      const w = whereSql(table, where);
      const r = await q(`DELETE FROM ${table}${w.sql} RETURNING ${spec(table).pk[0]}`, w.vals);
      return r.length;
    },
    async find(table, where = {}, { order, limit } = {}) {
      checkCols(table, where);
      const o = parseOrder(table, order);
      const w = whereSql(table, where);
      const r = await q(
        `SELECT * FROM ${table}${w.sql}${o ? ` ORDER BY ${o.col} ${o.desc ? "DESC" : "ASC"}` : ""}${limit ? ` LIMIT ${Number(limit) | 0}` : ""}`,
        w.vals
      );
      return r.map((x) => normalize(table, x));
    },
    async get(table, where) { return (await this.find(table, where, { limit: 1 }))[0] || null; },
  };
}

async function pgStore(url) {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(url);
  const q = (text, params = []) => (typeof sql.query === "function" ? sql.query(text, params) : sql(text, params));
  return buildPg(q);
}

// لينك قاعدة البيانات: Vercel/Neon ممكن يسمّيه DATABASE_URL أو POSTGRES_URL،
// ولو اتحط "Custom Prefix" وقت الربط بيبقى مثلاً STORAGE_DATABASE_URL
function databaseUrl() {
  const env = process.env;
  if (env.DATABASE_URL) return env.DATABASE_URL;
  if (env.POSTGRES_URL) return env.POSTGRES_URL;
  const key = Object.keys(env).find((k) => /_(DATABASE_URL|POSTGRES_URL)$/.test(k) && /^postgres(ql)?:\/\//.test(env[k] || ""));
  return key ? env[key] : "";
}

let storePromise = null;
function getStore() {
  if (!storePromise) {
    const url = databaseUrl();
    if (url) storePromise = pgStore(url);
    else if (process.env.VERCEL) storePromise = Promise.reject(configError()); // على Vercel لازم قاعدة بيانات
    else storePromise = Promise.resolve(fileStore());
    storePromise.catch(() => { storePromise = null; }); // لو فشل، يحاول تاني في الطلب الجاي
  }
  return storePromise;
}
// للاختبار بس: تشغيل كود Postgres على قاعدة بيانات تجريبية
function _useStoreForTests(store) { storePromise = Promise.resolve(store); }

module.exports = { getStore, databaseUrl, DATA_DIR, TABLES, buildPg, fileStore, _useStoreForTests };
