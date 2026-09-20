const { quote, haversineKm } = require("./fare");
const geo = require("./geo");

function inr(n) {
  return "Rs " + Number(n || 0).toLocaleString("en-IN");
}

function pack(title, sections, suggestions) {
  const parts = [title];
  (sections || []).forEach((s) => {
    if (s.heading) parts.push(s.heading);
    if (s.text) parts.push(s.text);
    if (s.items) parts.push(s.items.join(" "));
    if (s.rows) parts.push(s.rows.map((r) => r.join(": ")).join(" "));
  });
  return { title, sections: sections || [], suggestions: suggestions || [], reply: parts.filter(Boolean).join("\n") };
}

function carRows(c) {
  const r = c.rates || {};
  return [
    ["Vehicle", `${c.seats} seater · ${c.type || ""}${c.number ? " · " + c.number : ""}`],
    ["Slab 1", `First ${r.slab1Km} km · ${inr(r.slab1Rate)}`],
    ["Slab 2", `${r.slab1Km + 1}–${r.slab2Km} km · ${inr(r.slab2Rate)}`],
    ["Thereafter", `${inr(r.perKm)} per km`],
    ["Waiting", `${inr(r.waitingPerDay)} per extra day`],
    ["Airport", `Pickup ${inr(r.airportPickup)} · Drop ${inr(r.airportDrop)}`]
  ];
}

function findCar(cars, msg) {
  const m = msg.toLowerCase();
  return cars.find((c) => {
    const bits = [c.name, c.type, c.number, (c.name || "").split(" ").pop()].filter(Boolean);
    return bits.some((b) => m.includes(String(b).toLowerCase()));
  });
}

function cleanPlace(s) {
  return String(s || "")
    .replace(/[?.,]/g, " ")
    .replace(/^(?:fare|rate|price|cost|quote|from|book|trip|travel|local|outstation|airport)\s+/i, "")
    .replace(/\s+(?:fare|rate|price|cost|quote|charges?|return|single|one way|round trip|please|estimate)$/i, "")
    .replace(/\s+(?:return|single|one way|round).*$/i, "")
    .trim();
}

function splitRoute(msg) {
  const m = msg.replace(/\?/g, " ");
  const parts = m.split(/\s+(?:to|towards|till|->|→)\s+/i);
  if (parts.length >= 2) {
    const from = cleanPlace(parts[0]);
    const to = cleanPlace(parts[1]);
    if (from.length >= 2 && to.length >= 2) return { from, to };
  }
  return null;
}

async function tryQuote(db, cars, msg) {
  const route = splitRoute(msg);
  if (!route) return null;
  const car = findCar(cars, msg) || cars[0];
  if (!car) return null;
  const a = await geo.resolvePlace(route.from);
  const b = await geo.resolvePlace(route.to);
  if (!a || !b) {
    return pack("Place not found", [
      { type: "p", text: `I could not place “${route.from}” or “${route.to}” in India.` },
      { type: "ol", heading: "Set it on Book trip", items: [
        "Open Book trip",
        "Type From and press Enter",
        "Type To and press Enter",
        "The map draws the route and the fare appears"
      ]}
    ], ["How do I book a trip?", "Show all car rates"]);
  }
  const km = haversineKm(a, b) || 1;
  const tripKind = /return|round/.test(msg) ? "return" : "single";
  const travelType = /airport|pickup|drop/.test(msg) ? "airport" : /outstation|mumbai|goa|delhi|shirdi|mahabaleshwar/.test(msg) ? "outstation" : "local";
  const q = quote({
    car,
    travelType,
    airportKind: /drop/.test(msg) ? "drop" : "pickup",
    tripKind,
    distanceKm: km,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10)
  });
  return pack("Fare estimate", [
    { type: "kv", rows: [
      ["From", a.name],
      ["To", b.name],
      ["Car", car.name],
      ["Trip", `${tripKind} · ${travelType}`],
      ["Distance", `${q.distanceKm} km`],
      ["Billed", `${q.billedKm} km`],
      ["Fare", inr(q.fare)],
      ["Waiting (same day)", inr(0)],
      ["Total", inr(q.total)]
    ]},
    { type: "p", text: `Extra nights add ${inr(car.rates.waitingPerDay)} per day.` },
    { type: "ol", heading: "Next", items: [
      "Open Book trip",
      "Press Enter on both places",
      "Pick this car and confirm"
    ]}
  ], ["Show all car rates", "How do I book a trip?", "What is waiting charge?"]);
}

function suggestionsFor(kind) {
  const all = {
    book: ["How do I book a trip?", "Pune to Mumbai fare", "Airport pickup charges"],
    fare: ["Show all car rates", "What is waiting charge?", "Return trip fare"],
    cars: ["Which cars are available?", "Innova rates", "Airport drop for Dzire"],
    pay: ["How do I pay?", "GPay UPI ID", "Can I pay cash?"],
    map: ["Map is not moving", "How to set From and To", "Pune to Lonavala"]
  };
  return all[kind] || all.book;
}

function fleetSections(cars) {
  if (!cars.length) return [{ type: "p", text: "No cars are listed yet." }];
  return cars.map((c) => ({ type: "kv", heading: c.name, rows: carRows(c) }));
}

async function reply(db, message) {
  const msg = String(message || "").trim();
  const low = msg.toLowerCase();
  const co = db.company || {};
  const cars = (db.cars || []).filter((c) => c.active !== false);
  const carHit = findCar(cars, low);
  const hints = suggestionsFor("book");

  if (!msg) {
    return pack("Vedashri assistant", [
      { type: "p", text: `Namaste. I help with ${co.companyName || "Vedashri Travels"} bookings.` },
      { type: "ul", heading: "Ask me about", items: ["Booking steps", "Map and distance", "Live car rates", "Waiting and airport", "Payment and My trips"] }
    ], hints);
  }

  if (/owner|pin|dashboard|login/.test(low)) {
    return pack("Customer help only", [
      { type: "p", text: "This chat is for customers." },
      { type: "ul", items: ["New trip — use Book trip", "Existing trip — open My trips with your 10-digit mobile"] }
    ], ["How do I book a trip?", "How do I see my trips?"]);
  }

  const quoted = await tryQuote(db, cars, low).catch(() => null);
  if (quoted) return quoted;

  if (/how (do i |to )?book|book a trip|start booking|reserve/.test(low)) {
    return pack("How to book", [
      { type: "ol", items: [
        "Open Book trip",
        "Choose Local, Airport or Outstation",
        "Choose Single or Return",
        "Type From and press Enter — the map jumps there",
        "Type To and press Enter — or use Tap map and click",
        "Set dates (extra days add waiting)",
        "Pick a car — fare appears",
        "Pay by GPay, UPI, card or cash, then Confirm"
      ]}
    ], suggestionsFor("map"));
  }

  if (/map|enter key|not moving|location|from and to|destination|distance not/.test(low)) {
    return pack("Using the map", [
      { type: "ol", heading: "By place name", items: [
        "Type a place in India in From",
        "Press Enter",
        "Do the same for To",
        "The map draws a line and fare uses that distance"
      ]},
      { type: "ol", heading: "By tapping the map", items: [
        "Tap map: From, then click the map",
        "Tap map: To, then click again"
      ]},
      { type: "p", text: "You never enter coordinates. Open Book trip first if the map is blank." }
    ], ["Pune to Mumbai fare", "How do I book a trip?"]);
  }

  if (/airport|pickup|drop/.test(low)) {
    return pack("Airport rates", [
      { type: "p", text: "Airport trips use a fixed rate per car, not distance slabs. Pickup and drop differ. Return airport = pickup + drop." },
      { type: "kv", heading: "Current rates", rows: cars.map((c) => [c.name, `Pickup ${inr(c.rates.airportPickup)} · Drop ${inr(c.rates.airportDrop)}`]) },
      { type: "p", text: "On Book trip choose Airport, then Pickup or Drop." }
    ], ["How do I book a trip?", "Show all car rates"]);
  }

  if (/wait/.test(low)) {
    return pack("Waiting charges", [
      { type: "p", text: "Waiting is only extra calendar days between start and end date. Same-day is Rs 0." },
      { type: "kv", heading: "Per extra day", rows: cars.map((c) => [c.name, `${inr(c.rates.waitingPerDay)} / day`]) }
    ], ["Pune to Mahabaleshwar return", "Show all car rates"]);
  }

  if (/slab|how.*fare|how.*rate|calculated|distance/.test(low) || (/rate|fare|price|cost|charge/.test(low) && !carHit)) {
    return pack("How fares work", [
      { type: "ul", items: [
        "Local and outstation use 3 slabs per car",
        "Slab 1 and slab 2 are fixed amounts",
        "After slab 2, leftover km × per-km rate",
        "Return doubles the km before slabs",
        "Waiting is extra days only",
        "Airport is a separate fixed pickup or drop"
      ]},
      ...fleetSections(cars)
    ], ["Pune to Mumbai fare", "Airport pickup charges"]);
  }

  if (carHit) {
    return pack(carHit.name, [
      { type: "kv", rows: carRows(carHit) },
      { type: "p", text: "Pick this car on Book trip after From and To are set on the map." }
    ], ["Show all car rates", "Airport pickup charges"]);
  }

  if (/car|fleet|seater|innova|dzire|xuv|city|suv|muv/.test(low)) {
    return pack("Car fleet", fleetSections(cars), ["How do I book a trip?", "Airport pickup charges"]);
  }

  if (/outstation/.test(low)) {
    return pack("Outstation travel", [
      { type: "p", text: "Any India trip outside the city. Same 3 slabs as local." },
      { type: "ul", items: [
        "Return bills both ways",
        "Extra nights between start and end add waiting per day",
        "Type both cities, press Enter, pick the car"
      ]}
    ], ["Pune to Goa fare", "What is waiting charge?"]);
  }

  if (/local/.test(low)) {
    return pack("Local travel", [
      { type: "p", text: "City trips use the same 3 distance slabs." },
      { type: "ol", items: [
        "Type From and To",
        "Press Enter so the map measures km",
        "Choose Single or Return",
        "Pick a car"
      ]}
    ], ["How do I book a trip?", "Show all car rates"]);
  }

  if (/pay|gpay|upi|cash|qr|card/.test(low)) {
    return pack("Payment", [
      { type: "kv", rows: [
        ["GPay / UPI", co.gpayId || "Shown on Pay page"],
        ["Card", "Marked paid at booking"],
        ["Cash", "Driver collects. Pending until trip is completed"]
      ]},
      { type: "p", text: "After Confirm booking, open Pay to see the company QR." }
    ], ["How do I book a trip?", "How do I see my trips?"]);
  }

  if (/trip|booking|cancel|approve|my trips|status/.test(low)) {
    return pack("My trips", [
      { type: "ol", items: [
        "Open My trips",
        "Enter the 10-digit mobile used at booking",
        "Approve or cancel while pending or approved"
      ]},
      { type: "p", text: "Completion sends a WhatsApp thank-you. New bookings also open a greeting." }
    ], ["How do I book a trip?", "How do I pay?"]);
  }

  if (/whatsapp|contact|phone|address|office|call/.test(low)) {
    return pack("Contact", [
      { type: "kv", rows: [
        ["Call", co.contactNo || "—"],
        ["WhatsApp", co.whatsappNo || "—"],
        ["Office", co.address || "—"]
      ]},
      { type: "p", text: "You can also send a query from the home page." }
    ], ["How do I book a trip?", "How do I pay?"]);
  }

  if (/hello|hi |namaste|hey/.test(low)) {
    return pack("Namaste", [
      { type: "p", text: "I can quote a route, list live car rates, or walk you through booking and the map." },
      { type: "ul", heading: "Try", items: ["Pune to Mumbai fare", "How do I book a trip?", "Show all car rates"] }
    ], hints);
  }

  return pack("I can help with that", [
    { type: "p", text: "Ask in booking terms." },
    { type: "ul", heading: "Examples", items: [
      "Pune to Mumbai fare",
      "Airport pickup charges",
      "What is waiting charge?",
      "How do I use the map?"
    ]},
    { type: "p", text: `Fleet now: ${cars.map((c) => c.name).join(", ") || "none"}` }
  ], ["Pune to Mumbai fare", "How do I book a trip?", "Show all car rates"]);
}

module.exports = { reply };
