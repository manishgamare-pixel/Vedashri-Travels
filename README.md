# Vedashri Travels

India-only car travel desk for **Vedashri Travels**. Three links share one Node.js server.

Look in `public/` on GitHub:

| Link | GitHub file | Path |
|------|-------------|------|
| Customer (desktop website) | `public/customer.html` | `/customer.html` |
| Owner dashboard | `public/owner.html` | `/owner.html` |
| Customer mobile app | `public/app.html` | `/app.html` |

`/` is the same customer site as `/customer.html`. Full list: `LINKS.md`.

Default owner PIN: `2145` (change it under Company).

## Database

PostgreSQL if `DATABASE_URL` is set (Render). Otherwise `data/store.json`.

On Render, add **PostgreSQL** to the same service and link it. Render sets `DATABASE_URL`. Then redeploy. No paid disk needed.

## Keep data on Render (disk, optional)

Without a disk, Render wipes bookings and fleet on every restart. Attach a disk:

1. Render dashboard → your Web Service → **Disks** → **Add disk**
2. Mount path: `/var/data` (1 GB is enough)
3. **Environment** → add `DATA_DIR` = `/var/data`
4. Save and redeploy

Do this on the **existing** service. Do not create a new one. After that, owner edits and customer bookings survive restarts.

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

Render / Railway / VPS step-by-step: `docs/VEDASHRI_DEPLOY_RENDER.pdf`
