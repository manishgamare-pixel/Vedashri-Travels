const places = require("../data/india-places");
const { haversineKm } = require("./fare");

const INDIA = { minLat: 6.5, maxLat: 37.6, minLon: 68.0, maxLon: 97.5 };

function inIndia(lat, lon) {
  const a = Number(lat);
  const b = Number(lon);
  return a >= INDIA.minLat && a <= INDIA.maxLat && b >= INDIA.minLon && b <= INDIA.maxLon;
}

function scoreName(placeName, q) {
  const n = placeName.toLowerCase();
  const s = q.toLowerCase().trim();
  if (!s) return 0;
  if (n === s) return 100;
  if (n.startsWith(s)) return 90;
  if (n.includes(s)) return 80;
  const parts = s.split(/[\s,]+/).filter(Boolean);
  if (parts.every((p) => n.includes(p))) return 70;
  return 0;
}

function searchLocal(q, limit) {
  const ranked = places
    .map((p) => ({ ...p, score: scoreName(p.name, q) }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit || 10);
  return ranked;
}

function bestLocal(q) {
  const hits = searchLocal(q, 1);
  return hits[0] || null;
}

async function nominatimSearch(q) {
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&countrycodes=in&q=" +
    encodeURIComponent(q);
  const r = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "VedashriTravels/1.0 (bookings@vedashritravels.in)"
    }
  });
  if (!r.ok) return [];
  const arr = await r.json();
  return (arr || [])
    .map((x) => ({
      name: x.display_name,
      lat: Number(x.lat),
      lon: Number(x.lon)
    }))
    .filter((x) => inIndia(x.lat, x.lon));
}

async function nominatimReverse(lat, lon) {
  if (!inIndia(lat, lon)) return null;
  const url =
    "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&addressdetails=1&lat=" +
    encodeURIComponent(lat) +
    "&lon=" +
    encodeURIComponent(lon);
  const r = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "VedashriTravels/1.0 (bookings@vedashritravels.in)"
    }
  });
  if (!r.ok) return null;
  const x = await r.json();
  if (!x || x.error) return null;
  const addr = x.address || {};
  if (addr.country_code && addr.country_code !== "in") return null;
  const short = [addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city, addr.state]
    .filter(Boolean)
    .join(", ") || x.display_name;
  return { name: short, lat: Number(x.lat || lat), lon: Number(x.lon || lon) };
}

async function resolvePlace(q) {
  const text = String(q || "").trim();
  if (!text) return null;
  const local = bestLocal(text);
  if (local && local.score >= 70) {
    return { name: local.name, lat: local.lat, lon: local.lon, source: "list" };
  }
  const remote = await nominatimSearch(text);
  if (remote[0]) return { ...remote[0], source: "map" };
  if (local) return { name: local.name, lat: local.lat, lon: local.lon, source: "list" };
  return null;
}

function resolveFromBody(from, to, fromLat, fromLon, toLat, toLon) {
  let a = null;
  let b = null;
  if (fromLat != null && fromLon != null && inIndia(fromLat, fromLon)) {
    a = { name: from, lat: Number(fromLat), lon: Number(fromLon) };
  } else {
    const local = places.find((p) => p.name === from) || bestLocal(from);
    if (local) a = { name: local.name, lat: local.lat, lon: local.lon };
  }
  if (toLat != null && toLon != null && inIndia(toLat, toLon)) {
    b = { name: to, lat: Number(toLat), lon: Number(toLon) };
  } else {
    const local = places.find((p) => p.name === to) || bestLocal(to);
    if (local) b = { name: local.name, lat: local.lat, lon: local.lon };
  }
  return { a, b };
}

module.exports = {
  inIndia,
  searchLocal,
  bestLocal,
  nominatimSearch,
  nominatimReverse,
  resolvePlace,
  resolveFromBody,
  haversineKm
};
