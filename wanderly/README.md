# Wanderly — Smart Travel & Budget Planner

A full-stack travel website plus budget dashboard with a light, modern UI.

## Pages

| URL | What it is |
|---|---|
| `/` | Public website: hero, destinations, features, how it works, live estimator, FAQ, newsletter |
| `/destination.html?id=bali` | Destination detail page with costs and a quick estimator |
| `/app.html` | The dashboard (trips, expenses, itinerary, packing, estimator, converter) |

## Run it

```bash
npm install
npm start
# open http://localhost:3000
```

Requires Node 18+. Data is stored in `data/db.json` (created and seeded on first run; delete it to reset).

## Features

- **Dashboard** – next-trip hero with countdown, budget/spent/remaining stats, budget-vs-spent bars, spending donut, recent expenses
- **Explore** – 10 destinations with photos, tag filters, live search, per-day cost in your chosen currency
- **My Trips** – create trips, track budget progress, status (Upcoming / Ongoing / Completed)
- **Trip detail** – overview with budget health, day-by-day itinerary, expense log by category, packing checklist
- **Budget Estimator** – flights, stay, food, transport and activities for Budget / Comfort / Luxury, with tips and "create trip with this budget"
- **Currency converter** + global currency switcher (INR, USD, EUR, GBP, JPY, AED, THB, IDR, CHF, AUD, SGD)

## API

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/bootstrap` | trips, destinations, rates, categories |
| POST / PUT / DELETE | `/api/trips[/:id]` | create / update / delete a trip |
| POST / DELETE | `/api/trips/:id/expenses[/:eid]` | add / remove expense |
| POST / DELETE | `/api/trips/:id/itinerary[/:iid]` | add / remove activity |
| POST / PATCH / DELETE | `/api/trips/:id/packing[/:pid]` | packing items |
| POST | `/api/estimate` | smart budget estimate |
| GET | `/api/convert?amount=&from=&to=` | currency conversion |
| GET | `/api/summary?currency=` | dashboard totals |
| GET | `/api/destinations[/:id]` | destination list / detail with related picks |
| POST | `/api/subscribe` | newsletter sign-up (stored in `data/db.json`) |

## Notes

- Currency rates in `server.js` (`RATES`) are static; swap in a live rates API if you need exact figures.
- Photos load from Unsplash; a soft gradient shows if an image can't load.
