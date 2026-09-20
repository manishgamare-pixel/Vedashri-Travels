# Vedashri Travels

India-only car travel desk for **Vedashri Travels**. Two links share one Node.js server:

| Link | Who | Path |
|------|-----|------|
| Customer site | Book local, airport and outstation trips | `index.html` |
| Customer app | Mobile home-screen view | `/app.html` |
| Owner desk | Fleet, rates, staff, accounts, reports | `/owner.html` |

Default owner PIN: `2145` (change it under Company).

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000 (customer) and http://localhost:3000/owner.html (owner).

## Fare rules

- Local and outstation use three slabs per car: slab 1 fixed, slab 2 fixed, then rate per km.
- Return trips bill both directions.
- Extra calendar days between start and end add waiting charge per day for that car.
- Airport pickup and drop are fixed and different per car.

## Docs

See `docs/VEDASHRI_TRAVELS_GUIDE.pdf` for hosting, GitHub publish steps, and a user manual.
