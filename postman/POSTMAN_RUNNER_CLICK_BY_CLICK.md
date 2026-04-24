# Postman Runner Guide (Updated - Real Integration)

Use this guide to test everything we built, including real route/weather integration.

## 1) Start services

From project folder:

```bash
npm start
```

Keep terminal open. Server must keep running.

## 2) Import Postman files

Import these files:

- `postman/Wasel-Palestine-Full.postman_collection.json`
- `postman/Wasel-Runner-Ordered.postman_collection.json`
- `postman/Wasel-Local.postman_environment.json`

Select environment: **Wasel Local**.

## 3) First run (auth)

Run in this order:

1. `00 - Health -> GET /`
2. `01 - Auth -> POST /register`
3. `01 - Auth -> POST /login`

Token variables are saved automatically.

## 4) Admin SQL step (required)

Before admin endpoints, run this in pgAdmin Query Tool:

```sql
UPDATE users
SET role = 'admin'
WHERE email = '<email variable value from Postman environment>';
```

Then run login again:

- `01 - Auth -> POST /login`

## 5) Run full ordered suite

In Postman Runner, run collection:

- `Wasel Runner Ordered`

It covers:

- health
- auth
- checkpoints create/update/status
- incidents/reports/alerts
- routes estimate/analyze/safe-corridors/history/cache-status
- cleanup delete checkpoint

## 6) How to confirm it works correctly

### Core success signals

- Most requests are green (200/201).
- Checkpoint create is 201.
- Incidents/Reports/Alerts are 200 with `success: true`.
- Route estimate/analyze are either:
  - 200 with route/weather data, OR
  - 503 with `message: external service unavailable` (acceptable fallback if external API has quota/network issue).

### Route estimate success check

When 200, response should include:

- `data.route.distance` (number)
- `data.weather.condition` (string)
- `data.safety.score` (number)

### Cache status success check

`GET /api/v1/routes/cache-status` should return 200 and include:

- `data.cacheStatus`

## 7) Common failures and fixes

- `403 Access denied` on checkpoint admin requests:
  - Run admin SQL update.
  - Login again.

- `401 Invalid token`:
  - Run login again and retry.

- `404 checkpoint not found`:
  - Re-run create checkpoint request.

- `503 external service unavailable` on route endpoints:
  - Check internet.
  - Check keys in `.env`:
    - `OPENROUTESERVICE_API_KEY`
    - `OPENWEATHER_API_KEY`
  - Retry after short delay (provider limits can happen).

- `ECONNREFUSED`:
  - Make sure `npm start` is still running.

## 8) Final quick checklist

- [ ] Server runs without crash
- [ ] Health endpoint works
- [ ] Login works and token saved
- [ ] Admin role set and admin endpoints work
- [ ] Incidents/reports/alerts endpoints return success
- [ ] Routes estimate/analyze/safe-corridors/history/cache-status respond correctly
- [ ] No 500 caused by missing models

If all boxes are checked, your implementation is working correctly.
