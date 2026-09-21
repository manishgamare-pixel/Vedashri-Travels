const fs = require("fs");
const path = require("path");
const seed = require("../data/seed");

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const FILE = path.join(DATA_DIR, "store.json");
const listeners = new Set();

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function load() {
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify(clone(seed), null, 2));
  }
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function rev() {
  try {
    return String(fs.statSync(FILE).mtimeMs);
  } catch (_) {
    return String(Date.now());
  }
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  const snapshot = { rev: rev(), company: data.company, cars: data.cars };
  listeners.forEach((fn) => {
    try { fn(snapshot); } catch (_) {}
  });
}

function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function nextId(prefix) {
  return prefix + "-" + Date.now().toString(36).toUpperCase().slice(-6);
}

module.exports = { load, save, nextId, FILE, DATA_DIR, rev, onChange };
