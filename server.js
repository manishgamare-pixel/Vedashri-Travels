const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { load, save, nextId, rev, onChange, DATA_DIR, FILE, ready, usingPostgres } = require("./lib/store");
const { quote, haversineKm } = require("./lib/fare");
const places = require("./data/india-places");
const geo = require("./lib/geo");
const chat = require("./lib/chat");

const app = express();
const PORT = process.env.PORT || 3000;
const uploadDir = path.join(DATA_DIR, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
    cb(null, Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only images are allowed"));
  }
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use("/uploads", express.static(uploadDir));
app.use((req, res, next) => {
  if (req.path === "/" || /\.(html|js)$/.test(req.path)) {
    res.set("Cache-Control", "no-store");
  }
  next();
});
app.use(express.static(path.join(__dirname, "public")));

function publicCompany(company) {
  const { ownerPin, ...pub } = company;
  return pub;
}

function publicPayload() {
  const db = load();
  return {
    rev: rev(),
    company: publicCompany(db.company),
    cars: db.cars.filter((c) => c.active !== false)
  };
}

function carById(db, id) {
  return db.cars.find((c) => c.id === id);
}

function greeting(kind, booking, company) {
  const wa = company.whatsappNo || "";
  if (kind === "book") {
    return {
      title: "Booking received",
      text: `Namaste ${booking.customerName}, Vedashri Travels has received your ${booking.travelType} trip from ${booking.from} to ${booking.to} on ${booking.startDate}. Booking ${booking.id}. Amount Rs ${booking.total}. We will confirm shortly.`,
      whatsapp: `https://wa.me/${wa}?text=` + encodeURIComponent(`Namaste, my booking ${booking.id} is for ${booking.from} to ${booking.to}. Please confirm.`)
    };
  }
  if (kind === "complete") {
    return {
      title: "Trip completed",
      text: `Thank you ${booking.customerName}. Your trip ${booking.id} is complete. We hope you had a comfortable journey with Vedashri Travels. Do travel with us again.`,
      whatsapp: `https://wa.me/${wa}?text=` + encodeURIComponent(`Thank you Vedashri Travels. Trip ${booking.id} completed.`)
    };
  }
  if (kind === "cancel") {
    return {
      title: "Trip cancelled",
      text: `Hello ${booking.customerName}, booking ${booking.id} has been cancelled as requested.`,
      whatsapp: `https://wa.me/${wa}?text=` + encodeURIComponent(`Please cancel booking ${booking.id}.`)
    };
  }
  return {
    title: "Update",
    text: `Booking ${booking.id} is now ${booking.status}.`,
    whatsapp: `https://wa.me/${wa}`
  };
}

function pushMessage(db, booking, kind) {
  const g = greeting(kind, booking, db.company);
  db.messages.push({
    id: nextId("MSG"),
    bookingId: booking.id,
    kind,
    phone: booking.phone,
    text: g.text,
    createdAt: new Date().toISOString()
  });
  return g;
}

function periodFilter(list, period, date) {
  const d = date ? new Date(date) : new Date();
  return list.filter((b) => {
    const t = new Date(b.createdAt || b.date || b.startDate);
    if (period === "daily") {
      return t.toISOString().slice(0, 10) === d.toISOString().slice(0, 10);
    }
    if (period === "monthly") {
      return t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth();
    }
    if (period === "annual") return t.getFullYear() === d.getFullYear();
    return true;
  });
}

app.get("/api/health", (_req, res) => res.json({ ok: true, name: "Vedashri Travels" }));

app.get("/api/company", (_req, res) => {
  res.json(publicCompany(load().company));
});

app.get("/api/public", (_req, res) => {
  res.json(publicPayload());
});

app.get("/api/events", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-store",
    Connection: "keep-alive"
  });
  res.flushHeaders();
  const send = (payload) => {
    res.write("event: update\n");
    res.write("data: " + JSON.stringify(payload) + "\n\n");
  };
  send(publicPayload());
  const off = onChange(() => send(publicPayload()));
  const ping = setInterval(() => res.write("event: ping\ndata: 1\n\n"), 15000);
  req.on("close", () => {
    clearInterval(ping);
    off();
  });
});

app.post("/api/owner/login", (req, res) => {
  const db = load();
  const pin = String(req.body.pin || "").trim();
  const expected = String(db.company.ownerPin || "2145");
  if (pin !== expected) return res.status(401).json({ error: "Wrong PIN" });
  res.json({ ok: true, company: db.company });
});

app.get("/api/owner/company", (_req, res) => {
  res.json(load().company);
});

app.put("/api/owner/company", (req, res) => {
  const db = load();
  const allowed = [
    "ownerName", "companyName", "tagline", "address", "contactNo",
    "whatsappNo", "email", "gstin", "gpayId", "gpayQr", "logo", "city", "about", "ownerPin"
  ];
  for (const k of allowed) {
    if (req.body[k] !== undefined) db.company[k] = req.body[k];
  }
  save(db);
  res.json(db.company);
});

app.get("/api/cars", (_req, res) => {
  const db = load();
  res.json(db.cars.filter((c) => c.active !== false));
});

app.get("/api/owner/cars", (_req, res) => res.json(load().cars));

app.post("/api/owner/cars", (req, res) => {
  const db = load();
  const b = req.body;
  const car = {
    id: nextId("CAR"),
    name: b.name || "New car",
    type: b.type || "Sedan",
    seats: Number(b.seats) || 4,
    ac: b.ac !== false,
    fuel: b.fuel || "Petrol",
    number: b.number || "",
    image: b.image || "/assets/cars/dzire.svg",
    active: true,
    rates: {
      slab1Km: Number(b.slab1Km) || 80,
      slab1Rate: Number(b.slab1Rate) || 2000,
      slab2Km: Number(b.slab2Km) || 300,
      slab2Rate: Number(b.slab2Rate) || 3500,
      perKm: Number(b.perKm) || 12,
      waitingPerDay: Number(b.waitingPerDay) || 1200,
      airportPickup: Number(b.airportPickup) || 1400,
      airportDrop: Number(b.airportDrop) || 1200
    }
  };
  if (b.rates) car.rates = { ...car.rates, ...b.rates };
  db.cars.push(car);
  save(db);
  res.json(car);
});

app.put("/api/owner/cars/:id", (req, res) => {
  const db = load();
  const car = carById(db, req.params.id);
  if (!car) return res.status(404).json({ error: "Car not found" });
  const b = req.body;
  ["name", "type", "fuel", "number", "image", "active"].forEach((k) => {
    if (b[k] !== undefined) car[k] = b[k];
  });
  if (b.seats !== undefined) car.seats = Number(b.seats);
  if (b.ac !== undefined) car.ac = !!b.ac;
  if (b.rates) car.rates = { ...car.rates, ...b.rates };
  [
    "slab1Km", "slab1Rate", "slab2Km", "slab2Rate", "perKm",
    "waitingPerDay", "airportPickup", "airportDrop"
  ].forEach((k) => {
    if (b[k] !== undefined) car.rates[k] = Number(b[k]);
  });
  save(db);
  res.json(car);
});

app.delete("/api/owner/cars/:id", (req, res) => {
  const db = load();
  const i = db.cars.findIndex((c) => c.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: "Car not found" });
  const [removed] = db.cars.splice(i, 1);
  save(db);
  res.json(removed);
});

app.get("/api/places", (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json(places.slice(0, 12).map(({ name }) => ({ name })));
  const hits = geo.searchLocal(q, 10).map(({ name }) => ({ name }));
  res.json(hits);
});

app.get("/api/places/geo", async (req, res) => {
  try {
    const name = String(req.query.name || "").trim();
    const p = await geo.resolvePlace(name);
    if (!p) return res.status(404).json({ error: "Place not found in India" });
    res.json({ name: p.name, lat: p.lat, lon: p.lon });
  } catch (e) {
    res.status(502).json({ error: "Map lookup failed" });
  }
});

app.post("/api/geocode", async (req, res) => {
  try {
    const q = String(req.body.q || req.body.name || "").trim();
    if (q.length < 2) return res.status(400).json({ error: "Type a place in India" });
    const local = geo.searchLocal(q, 8).map(({ name, lat, lon }) => ({ name, lat, lon, source: "list" }));
    let remote = [];
    try {
      remote = (await geo.nominatimSearch(q)).slice(0, 5).map((p) => ({ ...p, source: "map" }));
    } catch (_) {}
    const seen = new Set();
    const hits = [];
    for (const p of local.concat(remote)) {
      const key = p.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({ name: p.name, lat: p.lat, lon: p.lon, source: p.source });
    }
    const best = hits[0] || null;
    res.json({ best, hits });
  } catch (e) {
    res.status(502).json({ error: "Could not find that place in India" });
  }
});

app.post("/api/reverse", async (req, res) => {
  try {
    const lat = Number(req.body.lat);
    const lon = Number(req.body.lon);
    if (!geo.inIndia(lat, lon)) return res.status(400).json({ error: "Select a point inside India" });
    let nearest = null;
    let best = 1e9;
    places.forEach((p) => {
      const d = haversineKm(p, { lat, lon });
      if (d < best) { best = d; nearest = p; }
    });
    let place = await geo.nominatimReverse(lat, lon);
    if (!place && nearest && best <= 12) place = { name: nearest.name, lat, lon };
    if (!place) place = { name: "Selected location in India", lat, lon };
    place.lat = lat;
    place.lon = lon;
    res.json(place);
  } catch (e) {
    res.status(502).json({ error: "Could not read that map point" });
  }
});

function tripPoints(body) {
  return geo.resolveFromBody(body.from, body.to, body.fromLat, body.fromLon, body.toLat, body.toLon);
}

app.post("/api/quote", async (req, res) => {
  const db = load();
  const { carId, travelType, airportKind, tripKind, from, to, startDate, endDate } = req.body;
  const car = carById(db, carId);
  if (!car) return res.status(400).json({ error: "Select a car" });
  let { a, b } = tripPoints(req.body);
  try {
    if (!a && from) a = await geo.resolvePlace(from);
    if (!b && to) b = await geo.resolvePlace(to);
  } catch (_) {}
  if (!a || !b) return res.status(400).json({ error: "Set From and To on the map or type a place in India" });
  const distanceKm = haversineKm(a, b) || 1;
  const q = quote({ car, travelType, airportKind, tripKind, distanceKm, startDate, endDate });
  res.json({
    from: a.name || from,
    to: b.name || to,
    fromLat: a.lat,
    fromLon: a.lon,
    toLat: b.lat,
    toLon: b.lon,
    car: { id: car.id, name: car.name, type: car.type, image: car.image },
    ...q
  });
});

app.get("/api/bookings", (req, res) => {
  const db = load();
  const phone = String(req.query.phone || "").replace(/\D/g, "");
  let list = db.bookings;
  if (phone) list = list.filter((b) => String(b.phone).replace(/\D/g, "").endsWith(phone.slice(-10)));
  res.json(list.slice().reverse());
});

app.post("/api/bookings", async (req, res) => {
  const db = load();
  const b = req.body;
  const car = carById(db, b.carId);
  if (!car) return res.status(400).json({ error: "Select a car" });
  if (!b.customerName || !b.phone) return res.status(400).json({ error: "Name and phone required" });
  let { a, b: dest } = tripPoints(b);
  try {
    if (!a && b.from) a = await geo.resolvePlace(b.from);
    if (!dest && b.to) dest = await geo.resolvePlace(b.to);
  } catch (_) {}
  if (!a || !dest) return res.status(400).json({ error: "Set From and To on the map or type a place in India" });
  const distanceKm = haversineKm(a, dest) || 1;
  const q = quote({
    car,
    travelType: b.travelType,
    airportKind: b.airportKind,
    tripKind: b.tripKind,
    distanceKm,
    startDate: b.startDate,
    endDate: b.endDate
  });
  const booking = {
    id: "BKG-" + Date.now().toString(36).toUpperCase(),
    createdAt: new Date().toISOString(),
    customerName: b.customerName,
    phone: String(b.phone).replace(/\D/g, "").slice(-10),
    travelType: b.travelType || "local",
    airportKind: b.airportKind || "",
    tripKind: b.tripKind || "single",
    from: a.name || b.from,
    to: dest.name || b.to,
    fromLat: a.lat,
    fromLon: a.lon,
    toLat: dest.lat,
    toLon: dest.lon,
    startDate: b.startDate,
    endDate: b.endDate || b.startDate,
    waitingDays: q.waitingDays,
    distanceKm: q.distanceKm,
    billedKm: q.billedKm,
    carId: car.id,
    fare: q.fare,
    waitingCharge: q.waitingCharge,
    total: q.total,
    paymentMethod: b.paymentMethod || "cash",
    paymentStatus: b.paymentMethod === "cash" ? "pending" : "paid",
    status: "pending",
    notes: b.notes || ""
  };
  db.bookings.push(booking);
  const greet = pushMessage(db, booking, "book");
  save(db);
  res.json({ booking, greeting: greet, gpay: { id: db.company.gpayId, qr: db.company.gpayQr } });
});

app.post("/api/bookings/:id/status", (req, res) => {
  const db = load();
  const booking = db.bookings.find((x) => x.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  const status = req.body.status;
  const allowed = ["pending", "approved", "cancelled", "completed"];
  if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });
  booking.status = status;
  if (status === "completed" && booking.paymentMethod === "cash") booking.paymentStatus = "paid";
  let greet = null;
  if (status === "completed") greet = pushMessage(db, booking, "complete");
  if (status === "cancelled") greet = pushMessage(db, booking, "cancel");
  if (status === "approved") {
    greet = {
      title: "Trip approved",
      text: `Namaste ${booking.customerName}, booking ${booking.id} is approved. Driver will reach ${booking.from} on ${booking.startDate}.`,
      whatsapp: `https://wa.me/${db.company.whatsappNo}`
    };
  }
  save(db);
  res.json({ booking, greeting: greet });
});

app.post("/api/queries", (req, res) => {
  const db = load();
  const q = {
    id: nextId("Q"),
    createdAt: new Date().toISOString(),
    name: req.body.name || "Guest",
    phone: req.body.phone || "",
    message: req.body.message || "",
    status: "open"
  };
  db.queries.push(q);
  save(db);
  res.json(q);
});

app.get("/api/owner/queries", (_req, res) => res.json(load().queries.slice().reverse()));

app.post("/api/owner/queries/:id", (req, res) => {
  const db = load();
  const q = db.queries.find((x) => x.id === req.params.id);
  if (!q) return res.status(404).json({ error: "Not found" });
  if (req.body.status) q.status = req.body.status;
  save(db);
  res.json(q);
});

app.get("/api/owner/drivers", (_req, res) => res.json(load().drivers));

app.post("/api/owner/drivers", (req, res) => {
  const db = load();
  const d = {
    id: nextId("DRV"),
    name: req.body.name || "Driver",
    phone: req.body.phone || "",
    license: req.body.license || "",
    salary: Number(req.body.salary) || 0,
    chargesPerTrip: Number(req.body.chargesPerTrip) || 0,
    assignedCarId: req.body.assignedCarId || "",
    status: "active"
  };
  db.drivers.push(d);
  save(db);
  res.json(d);
});

app.put("/api/owner/drivers/:id", (req, res) => {
  const db = load();
  const d = db.drivers.find((x) => x.id === req.params.id);
  if (!d) return res.status(404).json({ error: "Not found" });
  Object.assign(d, req.body);
  if (req.body.salary !== undefined) d.salary = Number(req.body.salary);
  if (req.body.chargesPerTrip !== undefined) d.chargesPerTrip = Number(req.body.chargesPerTrip);
  save(db);
  res.json(d);
});

app.delete("/api/owner/drivers/:id", (req, res) => {
  const db = load();
  db.drivers = db.drivers.filter((x) => x.id !== req.params.id);
  save(db);
  res.json({ ok: true });
});

app.get("/api/owner/staff", (_req, res) => res.json(load().staff));

app.post("/api/owner/staff", (req, res) => {
  const db = load();
  const s = {
    id: nextId("STF"),
    name: req.body.name || "Staff",
    role: req.body.role || "Desk",
    phone: req.body.phone || "",
    salary: Number(req.body.salary) || 0,
    joinDate: req.body.joinDate || new Date().toISOString().slice(0, 10),
    status: "active"
  };
  db.staff.push(s);
  save(db);
  res.json(s);
});

app.put("/api/owner/staff/:id", (req, res) => {
  const db = load();
  const s = db.staff.find((x) => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: "Not found" });
  Object.assign(s, req.body);
  if (req.body.salary !== undefined) s.salary = Number(req.body.salary);
  save(db);
  res.json(s);
});

app.delete("/api/owner/staff/:id", (req, res) => {
  const db = load();
  db.staff = db.staff.filter((x) => x.id !== req.params.id);
  save(db);
  res.json({ ok: true });
});

app.get("/api/owner/expenses", (_req, res) => res.json(load().expenses.slice().reverse()));

app.post("/api/owner/expenses", (req, res) => {
  const db = load();
  const e = {
    id: nextId("EXP"),
    date: req.body.date || new Date().toISOString().slice(0, 10),
    category: req.body.category || "other",
    title: req.body.title || "Expense",
    amount: Number(req.body.amount) || 0
  };
  db.expenses.push(e);
  save(db);
  res.json(e);
});

app.get("/api/owner/messages", (_req, res) => res.json(load().messages.slice().reverse()));

app.get("/api/owner/reports", (req, res) => {
  const db = load();
  const period = req.query.period || "monthly";
  const date = req.query.date;
  const bookings = periodFilter(db.bookings, period, date);
  const expenses = periodFilter(db.expenses, period, date);
  const income = bookings
    .filter((b) => b.status !== "cancelled")
    .reduce((s, b) => s + (Number(b.total) || 0), 0);
  const expenseTotal = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const salary = db.drivers.reduce((s, d) => s + (Number(d.salary) || 0), 0)
    + db.staff.reduce((s, d) => s + (Number(d.salary) || 0), 0);
  const byType = {};
  const byCar = {};
  const byDay = {};
  bookings.forEach((b) => {
    if (b.status === "cancelled") return;
    byType[b.travelType] = (byType[b.travelType] || 0) + b.total;
    const car = carById(db, b.carId);
    const name = car ? car.name : b.carId;
    byCar[name] = (byCar[name] || 0) + b.total;
    const day = (b.startDate || b.createdAt || "").slice(0, 10);
    byDay[day] = (byDay[day] || 0) + b.total;
  });
  res.json({
    period,
    count: bookings.length,
    completed: bookings.filter((b) => b.status === "completed").length,
    pending: bookings.filter((b) => b.status === "pending").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
    income,
    expenses: expenseTotal,
    payroll: period === "monthly" || period === "annual" ? salary * (period === "annual" ? 12 : 1) : 0,
    profit: income - expenseTotal,
    byType,
    byCar,
    byDay,
    bookings,
    expenseRows: expenses
  });
});

app.get("/api/owner/export.csv", (req, res) => {
  const db = load();
  const kind = req.query.kind || "bookings";
  let rows = [];
  if (kind === "bookings") {
    rows = [["ID", "Date", "Customer", "Phone", "Type", "From", "To", "Car", "Total", "Pay", "Status"]];
    db.bookings.forEach((b) => {
      const car = carById(db, b.carId);
      rows.push([b.id, b.startDate, b.customerName, b.phone, b.travelType, b.from, b.to, car ? car.name : "", b.total, b.paymentMethod, b.status]);
    });
  } else if (kind === "staff") {
    rows = [["ID", "Name", "Role", "Phone", "Salary", "Join", "Status"]];
    db.staff.forEach((s) => rows.push([s.id, s.name, s.role, s.phone, s.salary, s.joinDate, s.status]));
  } else if (kind === "drivers") {
    rows = [["ID", "Name", "Phone", "License", "Salary", "Trip charge", "Car", "Status"]];
    db.drivers.forEach((d) => rows.push([d.id, d.name, d.phone, d.license, d.salary, d.chargesPerTrip, d.assignedCarId, d.status]));
  } else {
    rows = [["ID", "Date", "Category", "Title", "Amount"]];
    db.expenses.forEach((e) => rows.push([e.id, e.date, e.category, e.title, e.amount]));
  }
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=vedashri-${kind}.csv`);
  res.send(csv);
});

app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  res.json({ url: "/uploads/" + req.file.filename });
});

app.post("/api/chat", async (req, res) => {
  try {
    const out = await chat.reply(load(), req.body.message);
    res.json(out);
  } catch (_) {
    res.json({
      reply: "I can still help. Ask how to book, Pune to Mumbai fare, car rates, airport pickup, waiting, or payment.",
      suggestions: ["How do I book a trip?", "Pune to Mumbai fare", "Show all car rates"]
    });
  }
});

app.get("/customer", (_req, res) => res.sendFile(path.join(__dirname, "public", "customer.html")));
app.get("/owner", (_req, res) => res.sendFile(path.join(__dirname, "public", "owner.html")));
app.get("/app", (_req, res) => res.sendFile(path.join(__dirname, "public", "app.html")));

ready().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log("Vedashri Travels running on http://localhost:" + PORT);
    console.log("Storage:", usingPostgres() ? "PostgreSQL" : ("file " + FILE));
  });
}).catch((err) => {
  console.error("Store init failed:", err);
  process.exit(1);
});
