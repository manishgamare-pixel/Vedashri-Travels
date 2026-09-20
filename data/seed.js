const cars = [
  {
    id: "car-dzire",
    name: "Maruti Swift Dzire",
    type: "Sedan",
    seats: 4,
    ac: true,
    fuel: "Petrol",
    number: "MH 12 VT 2145",
    image: "/assets/cars/dzire.svg",
    active: true,
    rates: {
      slab1Km: 80,
      slab1Rate: 2000,
      slab2Km: 300,
      slab2Rate: 3500,
      perKm: 12,
      waitingPerDay: 1200,
      airportPickup: 1400,
      airportDrop: 1200
    }
  },
  {
    id: "car-city",
    name: "Honda City",
    type: "Sedan",
    seats: 4,
    ac: true,
    fuel: "Petrol",
    number: "MH 12 VT 3321",
    image: "/assets/cars/city.svg",
    active: true,
    rates: {
      slab1Km: 80,
      slab1Rate: 2400,
      slab2Km: 300,
      slab2Rate: 4000,
      perKm: 14,
      waitingPerDay: 1400,
      airportPickup: 1600,
      airportDrop: 1400
    }
  },
  {
    id: "car-innova",
    name: "Toyota Innova Crysta",
    type: "MUV",
    seats: 7,
    ac: true,
    fuel: "Diesel",
    number: "MH 12 VT 5508",
    image: "/assets/cars/innova.svg",
    active: true,
    rates: {
      slab1Km: 80,
      slab1Rate: 3200,
      slab2Km: 300,
      slab2Rate: 5500,
      perKm: 18,
      waitingPerDay: 1800,
      airportPickup: 2200,
      airportDrop: 2000
    }
  },
  {
    id: "car-xuv",
    name: "Mahindra XUV700",
    type: "SUV",
    seats: 6,
    ac: true,
    fuel: "Diesel",
    number: "MH 14 VT 9088",
    image: "/assets/cars/xuv.svg",
    active: true,
    rates: {
      slab1Km: 80,
      slab1Rate: 3600,
      slab2Km: 300,
      slab2Rate: 6200,
      perKm: 20,
      waitingPerDay: 2000,
      airportPickup: 2500,
      airportDrop: 2300
    }
  }
];

module.exports = {
  company: {
    ownerName: "Vedashri Patil",
    companyName: "Vedashri Travels",
    tagline: "Safe, on-time car travel across India",
    address: "Shop 12, FC Road, Shivajinagar, Pune, Maharashtra 411005",
    contactNo: "+91 98765 43210",
    whatsappNo: "919876543210",
    email: "bookings@vedashritravels.in",
    gstin: "27AABCV1234M1Z5",
    gpayId: "vedashritravels@okicici",
    gpayQr: "/assets/gpay-qr.svg",
    logo: "/assets/logo.svg",
    city: "Pune",
    ownerPin: "2145",
    about: "Family-run car travel from Pune. Local, airport and outstation trips across India."
  },
  cars,
  drivers: [
    {
      id: "drv-1",
      name: "Ramesh Jadhav",
      phone: "+91 98220 11122",
      license: "MH12 20110012345",
      salary: 18000,
      chargesPerTrip: 500,
      assignedCarId: "car-dzire",
      status: "active"
    },
    {
      id: "drv-2",
      name: "Sanjay Pawar",
      phone: "+91 98220 33344",
      license: "MH14 20140055678",
      salary: 22000,
      chargesPerTrip: 700,
      assignedCarId: "car-innova",
      status: "active"
    }
  ],
  staff: [
    {
      id: "stf-1",
      name: "Priya Deshmukh",
      role: "Booking desk",
      phone: "+91 98810 55566",
      salary: 16000,
      joinDate: "2024-04-01",
      status: "active"
    },
    {
      id: "stf-2",
      name: "Amit Kulkarni",
      role: "Accounts",
      phone: "+91 98810 77788",
      salary: 20000,
      joinDate: "2023-11-12",
      status: "active"
    }
  ],
  bookings: [
    {
      id: "BKG-2401",
      createdAt: "2026-09-02T09:20:00.000Z",
      customerName: "Ananya Shah",
      phone: "9876500101",
      travelType: "airport",
      airportKind: "pickup",
      tripKind: "single",
      from: "Pune Airport (PNQ), Pune",
      to: "Koregaon Park, Pune",
      startDate: "2026-09-02",
      endDate: "2026-09-02",
      waitingDays: 0,
      distanceKm: 18,
      carId: "car-dzire",
      fare: 1400,
      waitingCharge: 0,
      total: 1400,
      paymentMethod: "gpay",
      paymentStatus: "paid",
      status: "completed",
      notes: "Flight AI 880"
    },
    {
      id: "BKG-2402",
      createdAt: "2026-09-10T11:00:00.000Z",
      customerName: "Rohit Mehta",
      phone: "9876500102",
      travelType: "outstation",
      airportKind: "",
      tripKind: "return",
      from: "Shivajinagar, Pune",
      to: "Mahabaleshwar, Maharashtra",
      startDate: "2026-09-12",
      endDate: "2026-09-14",
      waitingDays: 2,
      distanceKm: 240,
      carId: "car-innova",
      fare: 5500,
      waitingCharge: 3600,
      total: 9100,
      paymentMethod: "cash",
      paymentStatus: "pending",
      status: "approved",
      notes: "Family of 6"
    },
    {
      id: "BKG-2403",
      createdAt: "2026-09-18T07:40:00.000Z",
      customerName: "Neha Kulkarni",
      phone: "9876500103",
      travelType: "local",
      airportKind: "",
      tripKind: "single",
      from: "Hinjawadi, Pune",
      to: "Pune Railway Station, Pune",
      startDate: "2026-09-19",
      endDate: "2026-09-19",
      waitingDays: 0,
      distanceKm: 22,
      carId: "car-city",
      fare: 2400,
      waitingCharge: 0,
      total: 2400,
      paymentMethod: "upi",
      paymentStatus: "paid",
      status: "pending",
      notes: ""
    }
  ],
  queries: [
    {
      id: "Q-101",
      createdAt: "2026-09-17T14:10:00.000Z",
      name: "Karan Joshi",
      phone: "9811100998",
      message: "Do you have an Innova for Pune to Shirdi next Sunday?",
      status: "open"
    }
  ],
  expenses: [
    { id: "exp-1", date: "2026-09-01", category: "salary", title: "Driver salary - Ramesh", amount: 18000 },
    { id: "exp-2", date: "2026-09-01", category: "salary", title: "Staff salary - Priya", amount: 16000 },
    { id: "exp-3", date: "2026-09-05", category: "fuel", title: "Diesel - Innova", amount: 4200 }
  ],
  messages: []
};
