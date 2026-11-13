# Company X Feedback System (Devthon)

A full-stack feedback system for Company X's paint customers. Homeowners can leave feedback
through a phone-friendly web questionnaire; painters can use the web form or an SMS flow that
works with feature phones. Care reps use a dashboard to review responses, follow up on detractors,
and understand trends in ratings and customer comments.

The application uses a Django REST Framework API, a Next.js and TypeScript frontend, PostgreSQL,
and Africa's Talking for SMS. Local email is captured by Mailpit.

## Run the development environment
```bash
cp .env.example .env
docker compose up --build
```
- Web: http://localhost:3006  ·  API: http://localhost:8000
- Mailpit inbox: http://localhost:8025  ·  Django admin: http://localhost:8000/admin

Create the Django admin account with `docker compose exec api python manage.py createsuperuser`.
Then create care rep accounts in Django admin. Admin accounts are not care reps and cannot access
the alerts dashboard; accounts created through the admin are care reps without admin privileges.

The API and frontend source directories are mounted into their containers. Django's development
server and Next.js automatically reload code changes; the frontend's dependencies and build cache
stay in Docker volumes so Windows host dependencies are not used inside Linux containers. After
changing frontend dependencies, run `docker compose exec web pnpm install --frozen-lockfile` and
restart the web service with `docker compose restart web`.

Stop the containers with `docker compose down` (use `docker compose down -v` only when you also
want to delete the local PostgreSQL data and frontend dependency volumes).

## Tests
```bash
cd apps/api && pip install -r requirements-dev.txt && pytest   # needs Postgres (see .env.example)
cd apps/web && pnpm install && pnpm test
```

## Alerts (apps/api/alerts)
Both the web questionnaire and SMS replies use the same feedback submission path. A detractor
response creates an `Alert` and one in-app `Notification` per active care rep in the same
transaction as the response. After commit, a background worker sends email and, when configured,
SMS to the care team. Email includes the customer's contact details, scores and comment, with the
customer as `Reply-To`. Delivery status is stored on the alert, so a failed message does not lose
the feedback and can be retried:

```bash
docker compose exec api python manage.py retry_failed_alerts
```
If no care rep has an email, `CARE_ALERT_FALLBACK_EMAIL` is used. Care reps are users with
`is_care_rep=True`, created through Django admin. A `createsuperuser` account is an administrator,
not a care rep. Auth is session-based:
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
4. *Provider choice* - the official `openai` SDK pointed at Google's OpenAI-compatible Generative Language
   API, using `gemini-3.5-flash-lite`. The endpoint, model, and key are configured with `AI_BASE_URL`,
   `AI_MODEL`, and `AI_API_KEY`, so provider settings stay on the Django backend. Requests use
   `temperature=0` and a token limit to keep the six-label classification focused and predictable.

**Untrusted input.** A comment is customer text and could try to steer the model. So the reply is never trusted
either: its sentiment and topic must match the fixed label sets, otherwise the result is discarded. At worst a
hostile comment earns a wrong label; model-generated free text is never stored.

**Privacy.** Only the comment text is sent (never name, email or phone), but customers can type personal details
into a comment. Review Google's API terms and data handling before sending real customer feedback.

```bash
python manage.py ai_check                      # validates your key/model with one sample comment
python manage.py tag_comments --limit 200      # tag comments that have no analysis (rate-limited, 1.5s apart)
```
If `ai_check` reports a "model not found" error, verify the model ID available to your Google API project and
that `AI_BASE_URL` is Google's OpenAI-compatible endpoint, then update the corresponding environment values.

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

Demo data: `python manage.py seed_demo` creates up to 21 days of responses, with at least one
commented detractor and alert on each day, plus a care rep (`demo` / `demo-pass-123`). To call the AI
for every seeded comment and actually deliver each alert to the configured care team, run:

```bash
python manage.py seed_demo --tag-comments --send-alerts \
  --rep-email=care@example.com --rep-phone=+254700000000
```

`--tag-comments` requires `AI_API_KEY` and waits 1.5 seconds between model calls by default
(`--ai-sleep=0` disables the delay). `--send-alerts` can send real email/SMS to active care reps;
configure the intended recipients and SMS provider before using it. Use `--reset` only when you
intend to delete and recreate existing `@seed.example` demo rows; combining it with `--send-alerts`
will send those alerts again.

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
Each response contains three integer ratings from 1 to 5: product experience, customer care, and
happiness with the product. The API validates the range, calculates the mean using `Decimal`, and
rounds it to two decimal places. Classification uses the integer sum rather than a floating-point
comparison:

- Sum below 9: detractor; this triggers follow-up alerts.
- Sum equal to 9: passive (exactly 3.00).
- Sum above 9: promoter.

Web submissions and SMS replies both call `submit_feedback()`, which saves the customer and
response atomically. Alert creation runs in a savepoint so an alerting failure cannot discard the
customer's response. Email and SMS delivery run after the transaction commits and fail
independently. The alert records delivery attempts and status; `retry_failed_alerts` can retry
failed deliveries. See `apps/api/feedback/services.py`, `apps/api/feedback/scoring.py`, and
`apps/api/alerts/services.py`.

## Deployment pipeline
The GitHub Actions workflows are in `.github/workflows/`:

1. **CI** runs on pushes to branches other than `main` and on pull requests into `main` or
   `staging`. It runs Ruff and frontend lint/type checks, API and web tests, checks for missing
   Django migrations, and builds both Docker images. A push to `main` runs the same CI workflow as
   a prerequisite of CD.
2. **Staging** deploys automatically after CI succeeds on a push to `main`. The workflow builds and
   tags API and web images with the commit SHA, migrates the `feedback_staging` database, then
   deploys `feedback-api-staging` and `feedback-web-staging` to Cloud Run. The web image is built
   with the staging API URL. Pushing to the `staging` branch runs CI but does not deploy.
3. **Production** is a deliberate manual deployment. After verifying the latest `main` commit in
   staging, open **Actions → CD → Run workflow**, select `main`, and enable **Deploy the tested
   main commit to production**. CI runs again; if it passes, the workflow migrates the `feedback`
   database and deploys the production API and web services. Migration failures fail the job and
   stop deployment.

Staging and production use the Cloud SQL instance `feedbacksys:us-central1:assessment-db` but
separate databases. The GitHub repository variables `GCP_WORKLOAD_IDENTITY_PROVIDER` and
`GCP_SERVICE_ACCOUNT` configure workload identity. The deployment workflow reads application
credentials from Google Secret Manager; secrets are referenced by name in
`.github/workflows/deploy-cloudrun.yml` and must exist in the `feedbacksys` project.
For Cloud Run AI tagging, keep the `ai-api-key`, `ai-base-url`, and `ai-model` secret values aligned
with the local AI configuration; changing `.env` does not update deployed services.

For a sole contributor, the production `production` GitHub Environment must not require a separate
reviewer: the manual workflow dispatch is the release gate. If required reviewers are enabled,
GitHub will pause the job for an approver. Dependency and secret scanning jobs are not currently
included in CI.
