function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

function waitingDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const a = new Date(startDate + "T00:00:00");
  const b = new Date(endDate + "T00:00:00");
  const days = Math.round((b - a) / 86400000);
  return days > 0 ? days : 0;
}

function slabFare(rates, km) {
  const d = Math.max(0, Number(km) || 0);
  if (d <= rates.slab1Km) return rates.slab1Rate;
  if (d <= rates.slab2Km) return rates.slab2Rate;
  return Math.round(rates.slab2Rate + (d - rates.slab2Km) * rates.perKm);
}

function quote({ car, travelType, airportKind, tripKind, distanceKm, startDate, endDate }) {
  const rates = car.rates;
  const days = waitingDays(startDate, endDate);
  let billKm = Number(distanceKm) || 0;
  if (tripKind === "return") billKm = billKm * 2;

  let fare = 0;
  let basis = "distance-slab";
  if (travelType === "airport") {
    basis = "airport-fixed";
    fare = airportKind === "drop" ? rates.airportDrop : rates.airportPickup;
    if (tripKind === "return") {
      fare = rates.airportPickup + rates.airportDrop;
      basis = "airport-pickup-and-drop";
    }
  } else {
    fare = slabFare(rates, billKm);
  }

  const waitingCharge = days * (rates.waitingPerDay || 0);
  const total = fare + waitingCharge;
  return {
    distanceKm: Number(distanceKm) || 0,
    billedKm: billKm,
    waitingDays: days,
    fare,
    waitingCharge,
    total,
    basis,
    breakdown: {
      slab1: `First ${rates.slab1Km} km: Rs ${rates.slab1Rate}`,
      slab2: `${rates.slab1Km + 1}–${rates.slab2Km} km: Rs ${rates.slab2Rate}`,
      slab3: `Above ${rates.slab2Km} km: Rs ${rates.perKm}/km`,
      waiting: `Waiting Rs ${rates.waitingPerDay}/day`,
      airportPickup: rates.airportPickup,
      airportDrop: rates.airportDrop
    }
  };
}

module.exports = { haversineKm, waitingDays, slabFare, quote };
