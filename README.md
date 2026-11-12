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

## AI comment tagging (apps/api/insights)
The optional comment box on the questionnaire is analysed in the background: each comment gets a
**mood** (positive / neutral / negative) and a **topic** (colour, price, delivery, service, quality, other).
Care reps see the tags in the responses table (filterable), the drill-down drawer and the alerts table, and the
overview charts what customers talk about. It follows the brief's AI rules:
1. *Zero effort for the customer* - nothing to write or click; it runs after the response is saved.
2. *Fail gracefully* - tagging runs after commit in a worker thread. A timeout, a rate limit, a garbage reply or
   a missing key leaves the comment untagged and everything else working. `tag_comments` backfills later.
3. *Keys stay secret* - the model is called only from Django; `AI_API_KEY` lives in `.env`, never in React.
4. *Provider choice* - the official `openai` SDK pointed at NVIDIA's OpenAI-compatible endpoint, model
   **DeepSeek V4 Flash**. Why: free-tier access for a hackathon, one SDK that works with any OpenAI-compatible
   provider (switch by changing `AI_BASE_URL` / `AI_MODEL`), and a small fast model is plenty for a six-label
   classification. Thinking mode is switched off (`AI_DISABLE_THINKING=1`) so replies are quick and spend less quota.

**Untrusted input.** A comment is customer text and could try to steer the model. So the reply is never trusted
either: it must parse to exactly one value from each fixed list, otherwise it is discarded. At worst a hostile
comment earns a wrong label; it can never put free text into the data.

**Privacy.** Only the comment text is sent (never name, email or phone), but customers can type personal details
into a comment. NVIDIA's free API is a trial service; review its terms before sending real customer data.

```bash
python manage.py ai_check                      # validates your key/model with one sample comment
python manage.py tag_comments --limit 200      # tag comments that have no analysis (rate-limited, 1.5s apart)
```
Model names in NVIDIA's catalog change (it lists dated builds such as `-0731`); if `ai_check` fails with a
"model not found" error, copy the current ID from build.nvidia.com into `AI_MODEL`.

## SMS (Africa's Talking)
Three jobs, one gateway client (`apps/api/sms/`), every message logged in `SmsLog`:
1. **Invites** - care reps paste numbers on the dashboard's SMS page; each gets the "rate us" text.
2. **Replies** - a customer answers `4 5 4` (also `454`, `4,5,4`, `4-5-4`: product, care, happiness).
   The webhook scores it through the same `submit_feedback()` as the web form, so a 1-2-1 reply raises the
   same alert. The customer gets a thank-you (or help text if the reply cannot be read). A repeated
   gateway callback is processed once; a phone is capped at `SMS_MAX_RESPONSES_PER_DAY` (default 5).
3. **Alerts** - detractor alerts are also texted to care reps who have a phone number. `sent` means at
   least one rep was reached. Email and SMS fail independently; `retry_failed_alerts` retries both.

Phone numbers are normalised to E.164 (`0700 111 222` -> `+254700111222`, see `DEFAULT_COUNTRY_CODE`), so
the same person by web and SMS is one customer. Without `AT_API_KEY` SMS is skipped, not broken.

**Sandbox setup** (menu names may differ slightly in the Africa's Talking dashboard):
1. Create a sandbox app, copy its API key into `AT_API_KEY`; keep `AT_USERNAME=sandbox`.
2. Set `AT_WEBHOOK_TOKEN` to a long random string. Africa's Talking does not sign callbacks, so the URL
   carries the secret; with no token the webhook rejects everything.
3. Expose the app publicly (ngrok / Cloudflare Tunnel in dev) and set the sandbox *incoming messages*
   callback to `https://<public-host>/api/sms/inbound?token=<AT_WEBHOOK_TOKEN>` (the Next server proxies
   `/api` to Django).
4. Sandbox messages go to the web simulator, not real phones: send a reply from the simulator to see it
   arrive. For a care rep to get SMS alerts, give their user a phone number (Django admin, or
   `seed_demo --rep-phone`).
5. `AT_BASE_URL` overrides the gateway endpoint (staging proxy or a local stand-in).

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
