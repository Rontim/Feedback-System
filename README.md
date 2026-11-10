# Company X Feedback System (Devthon)

Django + DRF API, Next.js (TypeScript) web app, PostgreSQL, Mailpit for local email.

## Run locally

```bash
cp .env.example .env
docker compose up --build
```

- Web: <http://localhost:3025>  ·  API health: <http://localhost:9555/api/health>
- Mailpit inbox: <http://localhost:8067>  ·  Django admin: <http://localhost:9555/admin>

Create a care rep: `docker compose exec api python manage.py createsuperuser`

## Tests

```bash
cd apps/api && pip install -r requirements-dev.txt && pytest   # needs Postgres (see .env.example)
cd apps/web && npm ci && npm test
```

## Scoring

Mean of three 1-5 answers. Classified on the integer sum (<9 detractor, 9 passive, >9 promoter)
so the "exactly 3.00" rule is immune to float error. Implemented in `apps/api/feedback/scoring.py`.

## Design decisions

_To be completed: AI provider choice, SMS flow, projection method._
