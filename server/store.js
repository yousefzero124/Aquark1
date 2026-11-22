// =========================================================
// قاعدة البيانات (الحسابات)
// - على Vercel: Postgres (Neon) — بيتفعّل لوحده لما يبقى فيه DATABASE_URL
// - على جهازك: ملف data/db.json (للتجربة بس — مش بيترفع على GitHub)
// باقي الكود بيتعامل مع نفس الدوال في الحالتين.
// =========================================================
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

// الحقول اللي ينفع تتعدّل بعد إنشاء الحساب
const UPDATABLE = ["name", "role", "provider", "picture", "phone", "age", "gender", "city", "address", "prefs", "pass_hash", "google_sub"];

function configError() {
  const e = new Error("err_not_configured");
  e.status = 500;
  return e;
}

/* ---------- ملف محلي (للتجربة على الجهاز) ---------- */
function fileStore() {
  const load = () => {
    try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
    catch (e) { return { users: [], resets: [] }; }
  };
  const save = (db) => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, DB_FILE);
  };
  const now = () => new Date().toISOString();

  return {
    kind: "file",
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
  };
}

/* ---------- Postgres (على Vercel) ---------- */
async function pgStore(url) {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(url);
  const q = (text, params = []) => (typeof sql.query === "function" ? sql.query(text, params) : sql(text, params));

  // الجداول بتتعمل لوحدها أول مرة
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

  const iso = (v) => (v ? new Date(v).toISOString() : v);
  const row = (r) => (r ? { ...r, created_at: iso(r.created_at), updated_at: iso(r.updated_at) } : null);
  const first = async (text, params) => row((await q(text, params))[0]);

  return {
    kind: "postgres",
    getUserById: (id) => first("SELECT * FROM users WHERE id = $1", [id]),
    getUserByEmail: (email) => first("SELECT * FROM users WHERE email = $1", [email]),
    getUserByGoogleSub: (sub) => first("SELECT * FROM users WHERE google_sub = $1", [sub]),
    async createUser(u) {
      try {
        return await first(
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
      return first(`UPDATE users SET ${sets}, updated_at = now() WHERE id = $1 RETURNING *`, [id, ...vals]);
    },
    async deleteUser(id) {
      const u = await this.getUserById(id);
      await q("DELETE FROM users WHERE id = $1", [id]);
      if (u) await q("DELETE FROM password_resets WHERE email = $1", [u.email]);
    },
    async listUsers() { return (await q("SELECT * FROM users ORDER BY created_at DESC")).map(row); },
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
  };
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

module.exports = { getStore, databaseUrl, DATA_DIR };
