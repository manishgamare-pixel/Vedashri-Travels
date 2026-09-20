const state = {
  travelType: "local",
  airportKind: "pickup",
  tripKind: "single",
  from: "",
  to: "",
  fromPos: null,
  toPos: null,
  pickOnMap: "from",
  carId: "",
  cars: [],
  company: {},
  quote: null,
  map: null,
  fromMarker: null,
  toMarker: null,
  line: null,
  placesCache: {},
  mapReady: false
};

const INDIA = { lat: 21.5, lon: 78.9, zoom: 5 };

function $(id) { return document.getElementById(id); }
function toast(t) {
  const el = $("toast");
  el.textContent = t;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 2800);
}
function inr(n) { return "Rs " + Number(n || 0).toLocaleString("en-IN"); }

function showPage(id) {
  document.querySelectorAll(".page").forEach((p) => p.classList.toggle("on", p.id === "page-" + id));
  document.querySelectorAll("nav a[data-page]").forEach((a) => a.classList.toggle("active", a.dataset.page === id));
  if (id === "book") {
    ensureMap();
    setTimeout(() => { if (state.map) state.map.invalidateSize(); drawRoute(); }, 120);
  }
  if (id === "home") window.scrollTo(0, 0);
}

async function api(path, opts) {
  const r = await fetch(path, Object.assign({ headers: { "Content-Type": "application/json" } }, opts));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Request failed");
  return j;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function bindSeg(el, key, extra) {
  el.querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      el.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      state[key] = b.dataset.v;
      if (extra) extra();
      refreshQuote();
    });
  });
}

function waitHint() {
  const a = $("startDate").value;
  const b = $("endDate").value;
  if (!a || !b) return;
  const days = Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));
  $("waitHint").textContent = days
    ? days + " waiting day(s) will be charged per the selected car."
    : "Same-day trip: no waiting charge.";
}

function pinIcon(kind) {
  const color = kind === "from" ? "#1b4332" : "#c9a227";
  const label = kind === "from" ? "From" : "To";
  return L.divIcon({
    className: "vt-pin",
    iconSize: [54, 28],
    iconAnchor: [27, 28],
    html: `<div style="background:${color};color:#fff;padding:4px 8px;border-radius:8px;font-size:12px;white-space:nowrap">${label}</div>`
  });
}

function drawRoute() {
  if (!state.map) return;
  if (state.line) { state.map.removeLayer(state.line); state.line = null; }
  const pts = [];
  if (state.fromPos) {
    if (state.fromMarker) state.map.removeLayer(state.fromMarker);
    state.fromMarker = L.marker([state.fromPos.lat, state.fromPos.lon], { icon: pinIcon("from") }).addTo(state.map);
    pts.push([state.fromPos.lat, state.fromPos.lon]);
  }
  if (state.toPos) {
    if (state.toMarker) state.map.removeLayer(state.toMarker);
    state.toMarker = L.marker([state.toPos.lat, state.toPos.lon], { icon: pinIcon("to") }).addTo(state.map);
    pts.push([state.toPos.lat, state.toPos.lon]);
  }
  if (pts.length === 2) {
    state.line = L.polyline(pts, { color: "#2d6a4f", weight: 4 }).addTo(state.map);
    state.map.fitBounds(pts, { padding: [48, 48], maxZoom: 12 });
  } else if (pts.length === 1) {
    state.map.setView(pts[0], 12);
  }
  const hint = $("mapHint");
  if (hint) {
    if (pts.length === 2) hint.textContent = "Route set. Fare uses this distance.";
    else if (state.pickOnMap === "from") hint.textContent = "Type From and press Enter, or tap the map to set pickup.";
    else hint.textContent = "Type To and press Enter, or tap the map to set drop.";
  }
}

function setPick(kind) {
  state.pickOnMap = kind;
  const fromBtn = $("pickFrom");
  const toBtn = $("pickTo");
  if (fromBtn) fromBtn.classList.toggle("on", kind === "from");
  if (toBtn) toBtn.classList.toggle("on", kind === "to");
  drawRoute();
}

function applyPlace(kind, place) {
  if (!place || place.lat == null || place.lon == null) return;
  const pos = { lat: Number(place.lat), lon: Number(place.lon), name: place.name };
  if (kind === "from") {
    state.from = pos.name;
    state.fromPos = pos;
    $("fromBox").value = pos.name;
    $("fromList").classList.remove("show");
    if (!state.toPos) setPick("to");
  } else {
    state.to = pos.name;
    state.toPos = pos;
    $("toBox").value = pos.name;
    $("toList").classList.remove("show");
  }
  ensureMap();
  drawRoute();
  refreshQuote();
}

async function lookupPlace(q) {
  const key = q.trim().toLowerCase();
  if (key.length < 2) return null;
  if (state.placesCache[key]) return state.placesCache[key];
  const out = await api("/api/geocode", { method: "POST", body: JSON.stringify({ q }) });
  const best = out.best || (out.hits && out.hits[0]);
  if (best) state.placesCache[key] = best;
  return best;
}

async function confirmTyped(kind) {
  const input = kind === "from" ? $("fromBox") : $("toBox");
  const q = input.value.trim();
  if (q.length < 2) {
    toast("Type a place in India, then press Enter");
    return;
  }
  try {
    const place = await lookupPlace(q);
    if (!place) {
      toast("Could not find that place in India");
      return;
    }
    applyPlace(kind, place);
  } catch (e) {
    toast(e.message || "Map lookup failed");
  }
}

async function suggest(input, list, which) {
  const q = input.value.trim();
  if (q.length < 2) { list.classList.remove("show"); return; }
  try {
    const out = await api("/api/geocode", { method: "POST", body: JSON.stringify({ q }) });
    const hits = out.hits || [];
    list.innerHTML = hits.map((h) => `<li data-lat="${h.lat}" data-lon="${h.lon}">${h.name}</li>`).join("");
    list.classList.toggle("show", hits.length > 0);
    list.querySelectorAll("li").forEach((li) => {
      li.onmousedown = (ev) => ev.preventDefault();
      li.onclick = () => {
        applyPlace(which, { name: li.textContent, lat: Number(li.dataset.lat), lon: Number(li.dataset.lon) });
      };
    });
  } catch (_) {
    list.classList.remove("show");
  }
}

function bindPlaceBox(input, list, which) {
  let timer = null;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => suggest(input, list, which), 220);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const first = list.querySelector("li");
      if (first && list.classList.contains("show")) {
        applyPlace(which, { name: first.textContent, lat: Number(first.dataset.lat), lon: Number(first.dataset.lon) });
      } else {
        confirmTyped(which);
      }
    }
  });
  input.addEventListener("blur", () => {
    setTimeout(() => list.classList.remove("show"), 180);
  });
  input.addEventListener("focus", () => setPick(which));
}

function ensureMap() {
  if (state.mapReady || !window.L) return;
  const el = $("map");
  if (!el) return;
  state.map = L.map("map", { zoomControl: true, scrollWheelZoom: true }).setView([INDIA.lat, INDIA.lon], INDIA.zoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
    maxZoom: 18
  }).addTo(state.map);
  state.map.on("click", async (ev) => {
    const lat = ev.latlng.lat;
    const lon = ev.latlng.lng;
    try {
      const place = await api("/api/reverse", { method: "POST", body: JSON.stringify({ lat, lon }) });
      applyPlace(state.pickOnMap, place);
      if (state.pickOnMap === "from" && !state.toPos) setPick("to");
    } catch (e) {
      toast(e.message || "Select a point inside India");
    }
  });
  state.mapReady = true;
  setTimeout(() => state.map.invalidateSize(), 80);
}

function carRatesHtml(c) {
  const r = c.rates || {};
  return `Slab 1 (${r.slab1Km || 0} km): ${inr(r.slab1Rate)}<br>
        Slab 2 (to ${r.slab2Km || 0} km): ${inr(r.slab2Rate)}<br>
        Thereafter ${inr(r.perKm)}/km · Wait ${inr(r.waitingPerDay)}/day<br>
        Airport pickup ${inr(r.airportPickup)} · drop ${inr(r.airportDrop)}`;
}

function applyCompany(company) {
  if (!company) return;
  state.company = company;
  const brand = $("brandName");
  if (brand) brand.innerHTML = `${company.companyName || "Vedashri Travels"}<small id="tagline">${company.tagline || "India car travel"}</small>`;
  if ($("heroAbout") && company.about) $("heroAbout").textContent = company.about;
  if ($("logoImg") && company.logo) $("logoImg").src = company.logo + (company.logo.indexOf("?") >= 0 ? "&" : "?") + "v=" + Date.now();
  if ($("gpayId")) $("gpayId").textContent = company.gpayId || "";
  if ($("gpayQr") && company.gpayQr) $("gpayQr").src = company.gpayQr;
  if ($("foot")) $("foot").textContent = `${company.companyName || "Vedashri Travels"} · ${company.address || ""} · ${company.contactNo || ""}`;
  document.title = (company.companyName || "Vedashri Travels");
}

function renderCars() {
  const list = state.cars || [];
  const bookHtml = list.length ? list.map((c) => `
    <div class="car ${state.carId === c.id ? "on" : ""}" data-id="${c.id}">
      <img src="${c.image || "/assets/cars/dzire.svg"}" alt="${c.name}" />
      <div class="meta">
        <strong>${c.name}</strong>
        <span class="muted">${c.type || ""} · ${c.seats || 4} seats · ${c.fuel || ""} ${c.number ? "· " + c.number : ""}</span>
        <p class="muted">${carRatesHtml(c)}</p>
      </div>
    </div>`).join("") : `<p class="muted">No cars in the fleet yet. The owner can add them from the owner desk.</p>`;
  $("carList").innerHTML = bookHtml;
  $("carList").querySelectorAll(".car").forEach((el) => {
    el.onclick = () => { state.carId = el.dataset.id; renderCars(); refreshQuote(); };
  });
  $("fleetList").innerHTML = list.length ? list.map((c) => `
    <div class="car">
      <img src="${c.image || "/assets/cars/dzire.svg"}" alt="${c.name}" />
      <div class="meta">
        <strong>${c.name}</strong>
        <span class="muted">${c.type || ""} · ${c.seats || 4} seats · ${c.fuel || ""} · ${c.number || ""}</span>
        <p class="muted">${carRatesHtml(c)}</p>
      </div>
    </div>`).join("") : `<p class="muted">Fleet is empty. Ask the owner to add cars.</p>`;
}

function applyPublic(data) {
  if (!data) return;
  applyCompany(data.company);
  state.cars = data.cars || [];
  if (!state.cars.find((c) => c.id === state.carId)) {
    state.carId = state.cars[0] ? state.cars[0].id : "";
  }
  renderCars();
  refreshQuote();
}

async function loadPublic() {
  const data = await api("/api/public");
  applyPublic(data);
}

function watchOwnerUpdates() {
  try {
    const es = new EventSource("/api/events");
    es.addEventListener("update", (ev) => {
      try { applyPublic(JSON.parse(ev.data)); } catch (_) {}
    });
  } catch (_) {}
  setInterval(() => { loadPublic().catch(() => {}); }, 8000);
}

async function refreshQuote() {
  waitHint();
  if (!state.from || !state.to || !state.carId) return;
  try {
    const q = await api("/api/quote", {
      method: "POST",
      body: JSON.stringify({
        carId: state.carId,
        travelType: state.travelType,
        airportKind: state.airportKind,
        tripKind: state.tripKind,
        from: state.from,
        to: state.to,
        fromLat: state.fromPos && state.fromPos.lat,
        fromLon: state.fromPos && state.fromPos.lon,
        toLat: state.toPos && state.toPos.lat,
        toLon: state.toPos && state.toPos.lon,
        startDate: $("startDate").value,
        endDate: $("endDate").value
      })
    });
    state.quote = q;
    $("fareTotal").textContent = inr(q.total);
    $("fareDetail").textContent =
      `${q.distanceKm} km · billed ${q.billedKm} km · wait ${q.waitingDays} day(s) · fare ${inr(q.fare)} + waiting ${inr(q.waitingCharge)} · ${q.basis}`;
  } catch (e) {
    $("fareTotal").textContent = "Rs —";
    $("fareDetail").textContent = e.message;
  }
}

async function loadTrips() {
  const phone = $("tripPhone").value.replace(/\D/g, "");
  if (phone.length < 10) return toast("Enter 10-digit mobile");
  const list = await api("/api/bookings?phone=" + phone);
  $("tripRows").innerHTML = list.length ? list.map((b) => `
    <tr>
      <td>${b.id}</td>
      <td>${b.from}<br>→ ${b.to}</td>
      <td>${b.startDate}${b.endDate !== b.startDate ? " – " + b.endDate : ""}</td>
      <td>${inr(b.total)}<br><span class="muted">${b.paymentMethod}</span></td>
      <td><span class="badge ${b.status === "cancelled" ? "bad" : b.status === "pending" ? "warn" : "ok"}">${b.status}</span></td>
      <td class="actions">
        ${b.status === "pending" || b.status === "approved" ? `<button class="btn sm" data-act="approved" data-id="${b.id}">Approve</button>
        <button class="btn sm danger" data-act="cancelled" data-id="${b.id}">Cancel</button>` : ""}
        ${b.status === "approved" ? `<button class="btn sm gold" data-act="completed" data-id="${b.id}">Complete</button>` : ""}
      </td>
    </tr>`).join("") : `<tr><td colspan="6">No trips for this number.</td></tr>`;
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sectionHtml(s) {
  const head = s.heading ? `<div class="chat-h">${esc(s.heading)}</div>` : "";
  if (s.type === "kv" && s.rows) {
    const rows = s.rows.map((r) => `<div class="chat-kv"><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join("");
    return head + `<div class="chat-card">${rows}</div>`;
  }
  if (s.type === "ol" && s.items) {
    return head + `<ol class="chat-list">${s.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ol>`;
  }
  if (s.type === "ul" && s.items) {
    return head + `<ul class="chat-list">${s.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  }
  if (s.text) return head + `<p class="chat-p">${esc(s.text)}</p>`;
  return head;
}

function addChat(role, payload) {
  const div = document.createElement("div");
  div.className = "bubble " + (role === "me" ? "me" : "bot");
  if (role === "me" || typeof payload === "string") {
    div.textContent = typeof payload === "string" ? payload : (payload && payload.reply) || "";
  } else {
    const title = payload.title ? `<div class="chat-title">${esc(payload.title)}</div>` : "";
    const body = (payload.sections || []).map(sectionHtml).join("");
    div.innerHTML = title + body || esc(payload.reply || "");
  }
  $("chatMsgs").appendChild(div);
  $("chatMsgs").scrollTop = 9999;
}

function setChatSugs(list) {
  const box = $("chatSugs");
  if (!box) return;
  const items = list && list.length ? list : ["How do I book a trip?", "Pune to Mumbai fare", "Show all car rates"];
  box.innerHTML = items.map((t) => `<button type="button">${t}</button>`).join("");
}

async function sendChat(m) {
  if (!m) return;
  addChat("me", m);
  try {
    const r = await api("/api/chat", { method: "POST", body: JSON.stringify({ message: m }) });
    addChat("bot", r);
    setChatSugs(r.suggestions);
  } catch (_) {
    addChat("bot", "Please try again. Ask how to book, a city-to-city fare, or car rates.");
  }
}

async function boot() {
  showPage("home");
  $("startDate").value = todayStr();
  $("endDate").value = todayStr();
  await loadPublic();
  watchOwnerUpdates();

  document.querySelectorAll("[data-page]").forEach((a) => {
    a.addEventListener("click", (e) => { e.preventDefault(); showPage(a.dataset.page); });
  });
  document.querySelectorAll("[data-go]").forEach((el) => {
    el.addEventListener("click", () => {
      if (el.dataset.type) {
        state.travelType = el.dataset.type;
        $("typeSeg").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.v === state.travelType));
        $("airportRow").classList.toggle("hide", state.travelType !== "airport");
      }
      showPage(el.dataset.go);
    });
  });
  bindSeg($("typeSeg"), "travelType", () => {
    $("airportRow").classList.toggle("hide", state.travelType !== "airport");
  });
  bindSeg($("airSeg"), "airportKind");
  bindSeg($("tripSeg"), "tripKind");
  bindPlaceBox($("fromBox"), $("fromList"), "from");
  bindPlaceBox($("toBox"), $("toList"), "to");
  if ($("pickFrom")) $("pickFrom").onclick = () => setPick("from");
  if ($("pickTo")) $("pickTo").onclick = () => setPick("to");
  $("startDate").addEventListener("change", refreshQuote);
  $("endDate").addEventListener("change", refreshQuote);

  $("bookBtn").onclick = async () => {
    try {
      const out = await api("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          customerName: $("custName").value,
          phone: $("custPhone").value,
          travelType: state.travelType,
          airportKind: state.airportKind,
          tripKind: state.tripKind,
          from: state.from || $("fromBox").value,
          to: state.to || $("toBox").value,
          fromLat: state.fromPos && state.fromPos.lat,
          fromLon: state.fromPos && state.fromPos.lon,
          toLat: state.toPos && state.toPos.lat,
          toLon: state.toPos && state.toPos.lon,
          startDate: $("startDate").value,
          endDate: $("endDate").value,
          carId: state.carId,
          paymentMethod: $("payMethod").value,
          notes: $("notes").value
        })
      });
      toast(out.greeting.title);
      $("payResult").innerHTML = `<h3>${out.greeting.title}</h3>
        <p>${out.greeting.text}</p>
        <p><strong>${out.booking.id}</strong> · ${inr(out.booking.total)} · ${out.booking.paymentMethod}</p>
        <p><a class="btn" href="${out.greeting.whatsapp}" target="_blank" rel="noopener">WhatsApp greeting</a></p>
        <p class="muted">Pay GPay ${out.gpay.id}</p>
        <img class="qr" src="${out.gpay.qr}" alt="QR" />`;
      showPage("pay");
      if (out.greeting.whatsapp) window.open(out.greeting.whatsapp, "_blank");
    } catch (e) { toast(e.message); }
  };

  $("loadTrips").onclick = () => loadTrips().catch((e) => toast(e.message));
  $("tripRows").addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    try {
      const out = await api("/api/bookings/" + btn.dataset.id + "/status", {
        method: "POST",
        body: JSON.stringify({ status: btn.dataset.act })
      });
      toast(out.greeting ? out.greeting.title : "Updated");
      loadTrips();
    } catch (err) { toast(err.message); }
  });

  $("qBtn").onclick = async () => {
    try {
      await api("/api/queries", {
        method: "POST",
        body: JSON.stringify({ name: $("qName").value, phone: $("qPhone").value, message: $("qMsg").value })
      });
      toast("Query sent to Vedashri Travels");
      $("qMsg").value = "";
    } catch (e) { toast(e.message); }
  };
  addChat("bot", {
    title: "Vedashri assistant",
    sections: [
      { type: "p", text: "Namaste. Ask a route, booking steps, map help, or live car rates." },
      { type: "ul", heading: "Try", items: ["Pune to Mumbai fare", "How do I book a trip?", "Show all car rates"] }
    ]
  });
  setChatSugs(["How do I book a trip?", "Pune to Mumbai fare", "Show all car rates"]);
  $("chatFab").onclick = () => $("chat").classList.toggle("open");
  $("chatSugs").onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    sendChat(b.textContent);
  };
  $("chatForm").onsubmit = async (e) => {
    e.preventDefault();
    const m = $("chatIn").value.trim();
    $("chatIn").value = "";
    await sendChat(m);
  };
}

boot();
