# Postman Runner Guide (Very Simple)

This is a click-by-click guide to test everything.

## 1) Start the app first

Open terminal in project folder:

```bash
npm start
```

Keep this terminal open.

## 2) Import files in Postman

1. Open Postman.
2. Click **Import**.
3. Import these two files:
   - `postman/Wasel-Palestine-Full.postman_collection.json`
   - `postman/Wasel-Local.postman_environment.json`
4. Top-right, choose environment: **Wasel Local**.

## 3) Phase 1 (register + login)

Run these requests manually once:

1. `00 - Health -> GET /`
2. `01 - Auth -> POST /api/v1/auth/register`
3. `01 - Auth -> POST /api/v1/auth/login`

After login, Postman saves token automatically.

## 4) Make user admin (one SQL step)

You must do this before admin endpoints.

1. Open pgAdmin Query Tool.
2. Run:

```sql
UPDATE users
SET role = 'admin'
WHERE email = '<your email from Postman env>';
```

Tip: In Postman Environment, copy `email` value and paste it in SQL.

Then run login again:

4. `01 - Auth -> POST /api/v1/auth/login`

## 5) Run all tests with Collection Runner

1. In Postman, open your collection: **Wasel Palestine Full API**.
2. Click **Run**.
3. Keep all requests selected.
4. Click **Run Wasel Palestine Full API**.

Now each request has friendly checks. If something fails, you will see clear messages like:

- `403 on create checkpoint. Do SQL admin step, then login again.`
- `404 on /status: checkpoint was not found. Usually deleted too early.`
- `checkpointId is empty. Run POST /api/v1/checkpoints first.`

If you want safer order, run in this order manually:

1. `00 - Health` (all)
2. `01 - Auth` (all)
3. `03 - Checkpoints` (all)
4. `04 - Routes Estimation` (all)

## 6) What "good" looks like

- Most requests are green (200/201).
- `POST /checkpoints` returns 201.
- Routes endpoints return JSON with `success: true`.
- No red crash in terminal.

## 7) Common red errors and fix

- `404` on `GET /checkpoints/:id/status` or `GET /checkpoints/:id/history`
  - Cause: checkpoint was deleted before these requests.
  - Fix: use updated collection order (delete is now last), or run create checkpoint again.

- `403 Access denied. Required roles: admin`
  - Fix: run SQL admin update, then login again.

- `401 Invalid token`
  - Fix: run login request again.

- `ECONNREFUSED` / cannot connect
  - Fix: make sure `npm start` is running.

- `Database connection failed`
  - Fix: check PostgreSQL service is running and `.env` has correct password.

## 8) Super quick checklist

- [ ] API root works (`GET /`)
- [ ] Register works
- [ ] Login works
- [ ] User changed to admin in SQL
- [ ] Create checkpoint works
- [ ] Update checkpoint status works
- [ ] Route estimate works
- [ ] Cache status works

If all boxes are done, your project is working correctly.
