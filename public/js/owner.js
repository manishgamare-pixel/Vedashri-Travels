const PIN_KEY = "vt_owner";
function $(id) { return document.getElementById(id); }
function toast(t) {
  const el = $("toast");
  el.textContent = t;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 2400);
}
function inr(n) { return "Rs " + Number(n || 0).toLocaleString("en-IN"); }
async function api(path, opts) {
  const r = await fetch(path, Object.assign({ headers: { "Content-Type": "application/json" } }, opts || {}));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Failed");
  return j;
}

function showView(id) {
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("hide", v.id !== "view-" + id));
  document.querySelectorAll(".side button[data-view]").forEach((b) => b.classList.toggle("on", b.dataset.view === id));
}

function barChart(canvas, obj, color) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width = canvas.clientWidth || 480;
  const h = canvas.height = 220;
  ctx.clearRect(0, 0, w, h);
  const keys = Object.keys(obj);
  if (!keys.length) {
    ctx.fillStyle = "#4d6356";
    ctx.fillText("No data", 16, 28);
    return;
  }
  const max = Math.max(...keys.map((k) => obj[k]), 1);
  const bw = Math.max(18, (w - 40) / keys.length - 8);
  keys.forEach((k, i) => {
    const val = obj[k];
    const bh = (val / max) * (h - 50);
    const x = 20 + i * (bw + 8);
    ctx.fillStyle = color || "#2d6a4f";
    ctx.fillRect(x, h - 24 - bh, bw, bh);
    ctx.fillStyle = "#102318";
    ctx.font = "11px sans-serif";
    ctx.fillText(k.slice(0, 10), x, h - 8);
    ctx.fillText(String(Math.round(val)), x, h - 28 - bh);
  });
}

async function upload(file) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/upload", { method: "POST", body: fd });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Upload failed");
  return j.url;
}

let company = {};
let cars = [];

async function loadCompany() {
  company = await api("/api/owner/company");
  ["ownerName", "companyName", "tagline", "address", "contactNo", "whatsappNo", "email", "gstin", "gpayId", "about", "ownerPin"].forEach((k) => {
    if ($("c_" + k)) $("c_" + k).value = company[k] || "";
  });
  $("logoPrev").src = company.logo || "/assets/logo.svg";
  $("qrPrev").src = company.gpayQr || "/assets/gpay-qr.svg";
  $("sideLogo").src = company.logo || "/assets/logo.svg";
}

async function loadDash() {
  const rep = await api("/api/owner/reports?period=monthly");
  $("kpis").innerHTML = [
    ["Trips", rep.count],
    ["Income", inr(rep.income)],
    ["Expenses", inr(rep.expenses)],
    ["Profit", inr(rep.profit)]
  ].map(([l, v]) => `<div class="kpi"><span class="muted">${l}</span><b>${v}</b></div>`).join("");
  barChart($("chartType"), rep.byType, "#2d6a4f");
  barChart($("chartCar"), rep.byCar, "#c9a227");
  const books = await api("/api/bookings");
  $("recentBook").innerHTML = table(books.slice(0, 8), (b) => `<tr><td>${b.id}</td><td>${b.customerName}</td><td>${b.travelType}</td><td>${inr(b.total)}</td><td>${b.status}</td></tr>`, "<th>ID</th><th>Customer</th><th>Type</th><th>Total</th><th>Status</th>");
}

function table(rows, map, head) {
  return `<table><thead><tr>${head}</tr></thead><tbody>${rows.map(map).join("") || "<tr><td colspan='8'>None</td></tr>"}</tbody></table>`;
}

async function loadCars() {
  cars = await api("/api/owner/cars");
  $("carRows").innerHTML = cars.length ? cars.map((c) => `<tr>
    <td><img src="${c.image || "/assets/cars/dzire.svg"}" style="height:40px" alt="" /><br><strong>${c.name}</strong><br><span class="muted">${c.number || ""} · ${c.type || ""} · ${c.seats || ""} seats</span><br><span class="badge ${c.active === false ? "bad" : "ok"}">${c.active === false ? "hidden" : "on site"}</span></td>
    <td>${c.rates.slab1Km} km ${inr(c.rates.slab1Rate)}<br>to ${c.rates.slab2Km} km ${inr(c.rates.slab2Rate)}<br>then ${inr(c.rates.perKm)}/km</td>
    <td>P ${inr(c.rates.airportPickup)}<br>D ${inr(c.rates.airportDrop)}</td>
    <td>${inr(c.rates.waitingPerDay)}/day</td>
    <td class="actions">
      <button type="button" class="btn sm" data-edit="${c.id}">Edit</button>
      <button type="button" class="btn sm danger" data-del="${c.id}">Delete</button>
    </td>
  </tr>`).join("") : `<tr><td colspan="5">No cars yet. Add one above.</td></tr>`;
}

function fillCar(c) {
  window._carImg = c && c.image ? c.image : "";
  $("car_id").value = c ? c.id : "";
  $("car_name").value = c ? c.name : "";
  $("car_type").value = c ? c.type : "Sedan";
  $("car_seats").value = c ? c.seats : 4;
  $("car_fuel").value = c ? c.fuel : "Petrol";
  $("car_number").value = c ? c.number : "";
  $("car_active").value = c && c.active === false ? "false" : "true";
  const r = c ? c.rates : {};
  $("car_slab1Km").value = r.slab1Km != null ? r.slab1Km : 80;
  $("car_slab1Rate").value = r.slab1Rate != null ? r.slab1Rate : 2000;
  $("car_slab2Km").value = r.slab2Km != null ? r.slab2Km : 300;
  $("car_slab2Rate").value = r.slab2Rate != null ? r.slab2Rate : 3500;
  $("car_perKm").value = r.perKm != null ? r.perKm : 12;
  $("car_waitingPerDay").value = r.waitingPerDay != null ? r.waitingPerDay : 1200;
  $("car_airportPickup").value = r.airportPickup != null ? r.airportPickup : 1400;
  $("car_airportDrop").value = r.airportDrop != null ? r.airportDrop : 1200;
  const prev = $("car_imgPrev");
  if (c && c.image) {
    prev.src = c.image;
    prev.style.display = "block";
  } else {
    prev.removeAttribute("src");
    prev.style.display = "none";
  }
  $("carEditHint").textContent = c ? "Editing " + c.name + ". Save to push rates to the customer site." : "Add a new car, or press Edit on a row. Save to show it on the customer site.";
  $("saveCar").textContent = c ? "Update car" : "Save car";
  if (c) showView("fleet");
}

async function loadDrivers() {
  const list = await api("/api/owner/drivers");
  $("drvRows").innerHTML = list.map((d) => `<tr>
    <td>${d.name}<br><span class="muted">${d.license}</span></td>
    <td>${d.phone}</td><td>${inr(d.salary)}</td><td>${inr(d.chargesPerTrip)}</td>
    <td><button class="btn sm" data-dedit="${d.id}">Edit</button> <button class="btn sm danger" data-ddel="${d.id}">Delete</button></td>
  </tr>`).join("");
  window._drivers = list;
}

async function loadStaff() {
  const list = await api("/api/owner/staff");
  $("stfRows").innerHTML = list.map((s) => `<tr>
    <td>${s.name}</td><td>${s.role}<br>${s.phone}</td><td>${inr(s.salary)}</td><td>${s.joinDate}</td>
    <td><button class="btn sm" data-sedit="${s.id}">Edit</button> <button class="btn sm danger" data-sdel="${s.id}">Delete</button></td>
  </tr>`).join("");
  window._staff = list;
}

async function loadBookings() {
  const books = await api("/api/bookings");
  $("bkTable").innerHTML = table(books, (b) => `<tr>
    <td>${b.id}<br><span class="muted">${b.customerName} ${b.phone}</span></td>
    <td>${b.travelType} ${b.airportKind || ""} ${b.tripKind}<br>${b.from} → ${b.to}</td>
    <td>${b.startDate} – ${b.endDate}<br>wait ${b.waitingDays}d · ${b.distanceKm} km</td>
    <td>${inr(b.total)} ${b.paymentMethod}<br>${b.paymentStatus}</td>
    <td><span class="badge">${b.status}</span></td>
    <td>
      <button class="btn sm" data-st="approved" data-bid="${b.id}">Approve</button>
      <button class="btn sm gold" data-st="completed" data-bid="${b.id}">Complete</button>
      <button class="btn sm danger" data-st="cancelled" data-bid="${b.id}">Cancel</button>
    </td>
  </tr>`, "<th>Who</th><th>Trip</th><th>Dates</th><th>Pay</th><th>Status</th><th></th>");
  const qs = await api("/api/owner/queries");
  $("qTable").innerHTML = table(qs, (q) => `<tr><td>${q.name} ${q.phone}</td><td>${q.message}</td><td>${q.status}</td>
    <td><button class="btn sm" data-qid="${q.id}">Close</button></td></tr>`, "<th>From</th><th>Message</th><th>Status</th><th></th>");
  const ms = await api("/api/owner/messages");
  $("msgTable").innerHTML = table(ms.slice(0, 20), (m) => `<tr><td>${m.kind}</td><td>${m.bookingId}</td><td>${m.text}</td></tr>`, "<th>Kind</th><th>Booking</th><th>Message</th>");
}

async function loadExp() {
  const list = await api("/api/owner/expenses");
  $("expTable").innerHTML = table(list, (e) => `<tr><td>${e.date}</td><td>${e.category}</td><td>${e.title}</td><td>${inr(e.amount)}</td></tr>`, "<th>Date</th><th>Cat</th><th>Title</th><th>Amount</th>");
}

async function loadRep() {
  const period = $("period").value;
  const date = $("repDate").value;
  const rep = await api(`/api/owner/reports?period=${period}&date=${date}`);
  $("repKpis").innerHTML = [
    ["Count", rep.count], ["Income", inr(rep.income)], ["Expenses", inr(rep.expenses)],
    ["Payroll est.", inr(rep.payroll)], ["Profit", inr(rep.profit)]
  ].map(([l, v]) => `<div class="kpi"><span class="muted">${l}</span><b>${v}</b></div>`).join("");
  barChart($("chartDay"), rep.byDay, "#40916c");
  $("repTable").innerHTML = table(rep.bookings, (b) => `<tr><td>${b.id}</td><td>${b.startDate}</td><td>${b.customerName}</td><td>${b.travelType}</td><td>${inr(b.total)}</td><td>${b.status}</td></tr>`, "<th>ID</th><th>Date</th><th>Customer</th><th>Type</th><th>Total</th><th>Status</th>");
}

function openDesk() {
  $("gate").classList.add("hide");
  $("desk").classList.remove("hide");
  loadCompany();
  loadDash();
  loadCars();
  loadDrivers();
  loadStaff();
  loadBookings();
  loadExp();
  $("exp_date").value = new Date().toISOString().slice(0, 10);
  $("repDate").value = new Date().toISOString().slice(0, 10);
}

$("loginBtn").onclick = async () => {
  const pin = $("pin").value.trim();
  try {
    await api("/api/owner/login", { method: "POST", body: JSON.stringify({ pin }) });
    sessionStorage.setItem(PIN_KEY, "1");
    openDesk();
  } catch (e) {
    $("loginErr").textContent = e.message || "Wrong PIN";
  }
};
$("logout").onclick = () => { sessionStorage.removeItem(PIN_KEY); location.reload(); };
if (sessionStorage.getItem(PIN_KEY)) openDesk();

document.querySelectorAll(".side button[data-view]").forEach((b) => {
  b.onclick = () => showView(b.dataset.view);
});

$("saveCompany").onclick = async () => {
  try {
    const body = {};
    ["ownerName", "companyName", "tagline", "address", "contactNo", "whatsappNo", "email", "gstin", "gpayId", "about", "ownerPin"].forEach((k) => {
      body[k] = $("c_" + k).value;
    });
    if ($("logoPrev").dataset.url) body.logo = $("logoPrev").dataset.url;
    if ($("qrPrev").dataset.url) body.gpayQr = $("qrPrev").dataset.url;
    await api("/api/owner/company", { method: "PUT", body: JSON.stringify(body) });
    toast("Company saved — customer site updated");
    await loadCompany();
  } catch (e) { toast(e.message); }
};
$("logoFile").onchange = async () => {
  if (!$("logoFile").files[0]) return;
  const url = await upload($("logoFile").files[0]);
  $("logoPrev").src = url;
  $("logoPrev").dataset.url = url;
};
$("qrFile").onchange = async () => {
  if (!$("qrFile").files[0]) return;
  const url = await upload($("qrFile").files[0]);
  $("qrPrev").src = url;
  $("qrPrev").dataset.url = url;
};

$("saveCar").onclick = async () => {
  try {
    const id = $("car_id").value;
    const body = {
      name: $("car_name").value.trim(),
      type: $("car_type").value,
      seats: Number($("car_seats").value) || 4,
      fuel: $("car_fuel").value,
      number: $("car_number").value,
      active: $("car_active").value !== "false",
      slab1Km: Number($("car_slab1Km").value),
      slab1Rate: Number($("car_slab1Rate").value),
      slab2Km: Number($("car_slab2Km").value),
      slab2Rate: Number($("car_slab2Rate").value),
      perKm: Number($("car_perKm").value),
      waitingPerDay: Number($("car_waitingPerDay").value),
      airportPickup: Number($("car_airportPickup").value),
      airportDrop: Number($("car_airportDrop").value)
    };
    if (!body.name) return toast("Enter a car name");
    if (window._carImg) body.image = window._carImg;
    if (id) await api("/api/owner/cars/" + encodeURIComponent(id), { method: "PUT", body: JSON.stringify(body) });
    else await api("/api/owner/cars", { method: "POST", body: JSON.stringify(body) });
    toast(id ? "Car updated on customer site" : "Car added to customer site");
    fillCar(null);
    window._carImg = "";
    $("car_image").value = "";
    await loadCars();
  } catch (e) { toast(e.message); }
};
$("resetCar").onclick = () => fillCar(null);
$("car_image").onchange = async () => {
  if (!$("car_image").files[0]) return;
  try {
    window._carImg = await upload($("car_image").files[0]);
    $("car_imgPrev").src = window._carImg;
    $("car_imgPrev").style.display = "block";
    toast("Image uploaded");
  } catch (e) { toast(e.message); }
};
$("carRows").onclick = async (e) => {
  const ed = e.target.closest("[data-edit]");
  const del = e.target.closest("[data-del]");
  if (ed) {
    const car = cars.find((c) => c.id === ed.dataset.edit);
    if (car) fillCar(car);
    return;
  }
  if (del) {
    const car = cars.find((c) => c.id === del.dataset.del);
    if (!confirm("Delete " + (car ? car.name : "this car") + " from the fleet and customer site?")) return;
    try {
      await api("/api/owner/cars/" + encodeURIComponent(del.dataset.del), { method: "DELETE" });
      if ($("car_id").value === del.dataset.del) fillCar(null);
      toast("Car deleted from customer site");
      await loadCars();
    } catch (err) { toast(err.message); }
  }
};

$("saveDrv").onclick = async () => {
  const id = $("drv_id").value;
  const body = {
    name: $("drv_name").value, phone: $("drv_phone").value, license: $("drv_license").value,
    salary: $("drv_salary").value, chargesPerTrip: $("drv_chargesPerTrip").value, assignedCarId: $("drv_assignedCarId").value
  };
  if (id) await api("/api/owner/drivers/" + id, { method: "PUT", body: JSON.stringify(body) });
  else await api("/api/owner/drivers", { method: "POST", body: JSON.stringify(body) });
  $("drv_id").value = "";
  loadDrivers();
};
$("drvRows").onclick = async (e) => {
  const ed = e.target.closest("[data-dedit]");
  const del = e.target.closest("[data-ddel]");
  if (ed) {
    const d = window._drivers.find((x) => x.id === ed.dataset.dedit);
    $("drv_id").value = d.id;
    $("drv_name").value = d.name; $("drv_phone").value = d.phone; $("drv_license").value = d.license;
    $("drv_salary").value = d.salary; $("drv_chargesPerTrip").value = d.chargesPerTrip; $("drv_assignedCarId").value = d.assignedCarId;
  }
  if (del) { await fetch("/api/owner/drivers/" + del.dataset.ddel, { method: "DELETE" }); loadDrivers(); }
};

$("saveStf").onclick = async () => {
  const id = $("stf_id").value;
  const body = { name: $("stf_name").value, role: $("stf_role").value, phone: $("stf_phone").value, salary: $("stf_salary").value, joinDate: $("stf_joinDate").value };
  if (id) await api("/api/owner/staff/" + id, { method: "PUT", body: JSON.stringify(body) });
  else await api("/api/owner/staff", { method: "POST", body: JSON.stringify(body) });
  $("stf_id").value = "";
  loadStaff();
};
$("stfRows").onclick = async (e) => {
  const ed = e.target.closest("[data-sedit]");
  const del = e.target.closest("[data-sdel]");
  if (ed) {
    const s = window._staff.find((x) => x.id === ed.dataset.sedit);
    $("stf_id").value = s.id;
    $("stf_name").value = s.name; $("stf_role").value = s.role; $("stf_phone").value = s.phone;
    $("stf_salary").value = s.salary; $("stf_joinDate").value = s.joinDate;
  }
  if (del) { await fetch("/api/owner/staff/" + del.dataset.sdel, { method: "DELETE" }); loadStaff(); }
};

$("bkTable").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-bid]");
  if (!b) return;
  await api("/api/bookings/" + b.dataset.bid + "/status", { method: "POST", body: JSON.stringify({ status: b.dataset.st }) });
  loadBookings(); loadDash();
});
$("qTable").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-qid]");
  if (!b) return;
  await api("/api/owner/queries/" + b.dataset.qid, { method: "POST", body: JSON.stringify({ status: "closed" }) });
  loadBookings();
});
$("saveExp").onclick = async () => {
  await api("/api/owner/expenses", { method: "POST", body: JSON.stringify({
    date: $("exp_date").value, category: $("exp_category").value, title: $("exp_title").value, amount: $("exp_amount").value
  }) });
  loadExp();
};
$("runRep").onclick = loadRep;
