# Company X Feedback System (Devthon)

Django + DRF API, Next.js (TypeScript) web app, PostgreSQL, Mailpit for local email.

## Run locally
```bash
cp .env.example .env
docker compose up --build
```
- Web: http://localhost:3000  ·  API health: http://localhost:3000/api/health
- Mailpit inbox: http://localhost:8025  ·  Django admin: http://localhost:8000/admin

Create a care rep: `docker compose exec api python manage.py createsuperuser`

## Tests
```bash
cd apps/api && pip install -r requirements-dev.txt && pytest   # needs Postgres (see .env.example)
cd apps/web && pnpm install && pnpm test
```

## Alerts (apps/api/alerts)
A detractor response creates an `Alert` and one in-app `Notification` per active care rep in the
same transaction as the response. After commit, a background thread emails the care team (name,
email, phone, per-question scores, comment; `Reply-To` is the customer). Email status is tracked
on the alert (`pending/sent/failed`), so a mail outage never loses feedback and can be recovered:

```bash
docker compose exec api python manage.py retry_failed_alerts
```
If no care rep has an email, `CARE_ALERT_FALLBACK_EMAIL` is used. Care reps are users with
`is_care_rep=True` (create via `createsuperuser` or the Django admin). Auth is session-based:
`GET /api/auth/csrf`, then `POST /api/auth/login` with an `X-CSRFToken` header.
Endpoints: `/api/alerts` (`?unread=1`, `?handled=0|1`), `PATCH /api/alerts/{id}` (`read`, `handled`),
`/api/notifications`, `/api/notifications/read-all`, `/api/notifications/{id}/read`.

## Dashboard
Care reps sign in at `/dashboard/login`. Pages: Overview (totals, detractor/passive/promoter donut,
daily trend with a 7-day projection), Responses (server-side filtering, sorting and paging, with a
per-question drill-down drawer) and Alerts (open/handled, mark handled, contact details). Data refreshes
every 5 seconds; a new unread alert raises a toast and updates the bell.

Demo data: `python manage.py seed_demo --reset` creates ~30 days of responses, alerts and a care rep
(`demo` / `demo-pass-123`). It only touches rows whose email ends in `@seed.example`.

**Projection method.** Weighted least-squares line through the daily mean score (weight = that day's
response count), days with no responses left out, extended 7 days and clamped to 1-5. With fewer than
5 days of data the API reports `insufficient_data` and the UI says so instead of drawing a line.
Implemented and unit-tested in `apps/api/stats/projection.py`.

Days are bucketed in `TIME_ZONE` (default `Africa/Nairobi`); timestamps are stored in UTC.

## Frontend (apps/web)
Next.js App Router + Ant Design v5, styled only through `ConfigProvider` tokens (`app/theme.ts`).
Questionnaire lives in `features/feedback/`: `Steps` + `Form`, one question per step, `Rate` with
face icons, `Radio.Group` button style for customer type, `TextArea` with `showCount` for the
optional comment, and an AntD `Result` on success. Form field names match the API payload.
The browser only calls same-origin `/api/*`; Next rewrites it to Django (`API_URL`).

## Scoring
Mean of three 1-5 answers. Classified on the integer sum (<9 detractor, 9 passive, >9 promoter)
so the "exactly 3.00" rule is immune to float error. Implemented in `apps/api/feedback/scoring.py`.

## Design decisions
_To be completed: AI provider choice, SMS flow, projection method._
