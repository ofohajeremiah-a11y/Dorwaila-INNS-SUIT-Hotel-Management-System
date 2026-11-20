# Dorwaila Hotel API

Starter REST API for DORWAILA INN'S & SUIT HOTEL. The General Manager creates and deactivates department accounts and is the only role that can generate reports covering all departments. The API includes department greetings, operations activity, reservation/payment, expense approval, and worker shift/attendance endpoints.

## Requirements

- Python 3.12+ for local development, or Docker Desktop with Compose.
- SQLite for local experimentation and a temporary Render Free demonstration. SQLite data on Render Free is not persistent and may be lost after a restart, redeploy, or instance replacement. Use managed PostgreSQL with backups for ongoing use.

## Run locally with SQLite

From this `backend` directory in PowerShell:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Edit `.env`: set `SECRET_KEY` to a random value of at least 32 characters, and set `DATABASE_URL=sqlite:///./dorwaila_dev.db`.

Then install and start:

```powershell
python -m pip install -r requirements.txt
python -m app.bootstrap_admin
uvicorn app.main:app --reload
```

Before running `bootstrap_admin`, set the first account details in the current PowerShell session; do not put a real password in source code:

```powershell
$env:BOOTSTRAP_GM_EMAIL = "manager@your-hotel.example"
$env:BOOTSTRAP_GM_NAME = "General Manager"
$env:BOOTSTRAP_GM_PASSWORD = Read-Host "Initial General Manager password"
python -m app.bootstrap_admin
Remove-Item Env:BOOTSTRAP_GM_EMAIL, Env:BOOTSTRAP_GM_NAME, Env:BOOTSTRAP_GM_PASSWORD
```

Open `http://127.0.0.1:8000/docs` for the interactive OpenAPI page. Use Swagger's **Authorize** button with the General Manager email as the OAuth2 username and the password. The General Manager can then create accounts for Admin & Finance, Front Desk, Kitchen, Housekeeping, Bar, Security, Storekeeping, and Operations.

## Run with Docker Compose and PostgreSQL

Copy `.env.example` to `.env`, then set a unique `SECRET_KEY` (at least 32 characters) and a strong URL-safe `POSTGRES_PASSWORD`. From this directory:

```powershell
docker compose up --build -d
docker compose exec api python -m app.bootstrap_admin
```

Pass the bootstrap values into the one-time container process. In PowerShell:

```powershell
$env:BOOTSTRAP_GM_EMAIL = "manager@your-hotel.example"
$env:BOOTSTRAP_GM_NAME = "General Manager"
$env:BOOTSTRAP_GM_PASSWORD = Read-Host "Initial General Manager password"
docker compose exec -e BOOTSTRAP_GM_EMAIL -e BOOTSTRAP_GM_NAME -e BOOTSTRAP_GM_PASSWORD api python -m app.bootstrap_admin
Remove-Item Env:BOOTSTRAP_GM_EMAIL, Env:BOOTSTRAP_GM_NAME, Env:BOOTSTRAP_GM_PASSWORD
```

The API is available at `http://localhost:8000` for local use; production deployments must terminate HTTPS and restrict database access.

## Implemented endpoint groups

- `POST /api/v1/auth/token`, `GET /api/v1/auth/me`
- General Manager account management: `GET/POST /api/v1/manager/users`, `DELETE /api/v1/manager/users/{id}`, and enable/disable account endpoints. Delete deactivates the account so historical records remain.
- Welcome message: `GET /api/v1/welcome` returns hotel name, Dorwaila Avenue, the signed-in user's department, and the reservation endpoint.
- Room and reservation operations: `/api/v1/rooms`, `/api/v1/reservations`
- Reservation payments: `/api/v1/reservations/{id}/payments`
- Department activity: `/api/v1/departments/{department}/activities`
- Shift scheduling: Operations or the General Manager creates assignments using `POST /api/v1/attendance/shifts`.
- Attendance: staff view their own shifts/records and use `POST /api/v1/attendance/clock-in` and `/clock-out` for an assigned active shift.
- Expenses and approvals: `/api/v1/expenses`
- General Manager-only reporting and audit history: `/api/v1/manager/reports/*`, `/api/v1/manager/audit-logs`

FastAPI's generated API documentation lists request fields and response shapes.

## Deploy temporarily on Render Free

The root-level `render.yaml` configures a temporary Render Free API service using SQLite. No Neon account or separate PostgreSQL database is required. Render generates `SECRET_KEY` and prompts for `BOOTSTRAP_GM_EMAIL` and `BOOTSTRAP_GM_PASSWORD` during Blueprint setup. Use a password of at least 12 characters and enter it only in Render. The startup process creates tables and creates the initial General Manager only when the database is empty.

1. Push the project to GitHub. Never commit `.env` or real credentials.
2. In Render, choose **New → Blueprint**, select the repository, and review the root `render.yaml`. Select the **Free** instance if asked.
3. Enter the General Manager email and a strong password in the private Blueprint environment-value prompts.
4. Deploy. Check `/api/v1/health` and open `/docs`. Use **Authorize** in `/docs` with the credentials entered in Render.

**Important:** Render Free has an ephemeral filesystem. SQLite data may be lost after restarts, redeployments, or instance replacement. This is suitable only for a temporary demo. Use managed PostgreSQL with backups for ongoing use or real hotel records.

## Important limitations before production

- The bootstrap command creates tables for a fresh database. Use versioned Alembic migrations before deploying schema changes to production.
- Room conflict checking is implemented in application logic; high-concurrency production booking needs a database-level exclusion/locking strategy to prevent two simultaneous requests from reserving the same room.
- Report totals are grouped by original currency. Exchange-rate capture and SLE conversion, receipt uploads, inventory workflows, HR records, and full department-specific screens are not implemented yet.
- Shift schedules and clock records are implemented, but automated overtime rules, leave, absence reasons, payroll integration, and manager correction workflows are not.
- The first increment records payments but does not yet provide refund/void workflows or accounting-ledger reconciliation.
- Production deployment also needs HTTPS, a managed secret store, database and document backups, restore checks, monitoring, and a General Manager recovery procedure.

## Design reference

See [`../docs/SYSTEM_DESIGN.md`](../docs/SYSTEM_DESIGN.md) for the full product requirements and target data model.
