const fs = require("fs");
const path = require("path");
const seed = require("../data/seed");

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const FILE = path.join(DATA_DIR, "store.json");
const DATABASE_URL = process.env.DATABASE_URL || "";
const listeners = new Set();

let memory = null;
let pool = null;
let persistQueue = Promise.resolve();

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function notify(data) {
  const snapshot = { rev: rev(), company: data.company, cars: data.cars };
  listeners.forEach((fn) => {
    try { fn(snapshot); } catch (_) {}
  });
}

function loadFile() {
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify(clone(seed), null, 2));
  }
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function saveFile(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

async function initPg() {
  const { Pool } = require("pg");
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false }
  });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const res = await pool.query("SELECT data FROM app_state WHERE id = 1");
  if (res.rows[0] && res.rows[0].data) {
    memory = res.rows[0].data;
  } else {
    memory = fs.existsSync(FILE) ? loadFile() : clone(seed);
    await pool.query(
      "INSERT INTO app_state (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()",
      [memory]
    );
  }
}

async function ready() {
  if (memory) return memory;
  if (DATABASE_URL) {
    await initPg();
    return memory;
  }
  memory = loadFile();
  return memory;
}

function load() {
  if (!memory) memory = DATABASE_URL ? clone(seed) : loadFile();
  return memory;
}

function persistPg(data) {
  if (!pool) return;
  persistQueue = persistQueue.then(async () => {
    await pool.query(
      "INSERT INTO app_state (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW()",
      [data]
    );
  }).catch((err) => {
    console.error("Postgres save failed:", err.message);
  });
}

function save(data) {
  memory = data;
  if (DATABASE_URL) persistPg(data);
  else saveFile(data);
  notify(data);
}

function rev() {
  try {
    if (!DATABASE_URL && fs.existsSync(FILE)) return String(fs.statSync(FILE).mtimeMs);
  } catch (_) {}
  return String(Date.now());
}

function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function nextId(prefix) {
  return prefix + "-" + Date.now().toString(36).toUpperCase().slice(-6);
}

function usingPostgres() {
  return Boolean(DATABASE_URL);
}

module.exports = { load, save, nextId, FILE, DATA_DIR, rev, onChange, ready, usingPostgres };
