# Dorwaila Hotel API

Starter REST API for DORWAILA INN'S & SUIT HOTEL. The General Manager creates and deactivates department accounts and is the only role that can generate reports covering all departments. The API includes department greetings, operations activity, reservation/payment, expense approval, and worker shift/attendance endpoints.

## Requirements

- Python 3.12+ for local development, or Docker Desktop with Compose.
- PostgreSQL for a shared deployment. SQLite can be used for local experimentation.

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

## Deploy online with Render

The repository includes a root-level `render.yaml` Blueprint for the API web service. The Blueprint generates `SECRET_KEY` and uses `/api/v1/health` for health checks. It deliberately does not create a database resource automatically: provide `DATABASE_URL` from a PostgreSQL provider such as Neon in Render Environment settings. This avoids selecting a database plan that may not be available on your account. The startup command creates any missing tables for this initial version before starting the API.

1. Commit the project to a Git provider supported by Render (GitHub, GitLab, or Bitbucket). Do not commit `backend/.env` or real credentials.
2. Create a PostgreSQL database with Neon or another provider and copy its connection string. Keep it private.
3. In Render, choose **New → Blueprint**, connect the repository, and apply the web service shown in `render.yaml`.
4. In the Render service Environment settings, add `DATABASE_URL` and paste the PostgreSQL connection string. Render generates `SECRET_KEY` from the Blueprint.
5. Wait for the web service to become ready. The deploy URL appears on the web service page.
6. Open `https://YOUR-SERVICE.onrender.com/api/v1/health` and confirm it returns `{"status":"ok"}`. Then open `https://YOUR-SERVICE.onrender.com/docs` and confirm the API documentation loads.
7. Create the initial General Manager account once. Copy the PostgreSQL connection string from your database provider (for example, Neon). In a local PowerShell terminal, from `backend`, temporarily set it as `DATABASE_URL`, set the bootstrap account variables, and run:

   ```powershell
   $env:DATABASE_URL = "<Render external PostgreSQL connection string>"
   $env:BOOTSTRAP_GM_EMAIL = "manager@your-hotel.example"
   $env:BOOTSTRAP_GM_NAME = "General Manager"
   $env:BOOTSTRAP_GM_PASSWORD = Read-Host "Choose a strong password (12+ characters)"
   python -m app.bootstrap_admin
   Remove-Item Env:DATABASE_URL, Env:BOOTSTRAP_GM_EMAIL, Env:BOOTSTRAP_GM_NAME, Env:BOOTSTRAP_GM_PASSWORD
   ```

   If the database rejects the external connection, allow your current public IP in the database's IP allow list, run the bootstrap, then remove that temporary allow-list entry. Keep the connection string private.
8. Return to `/docs`, click **Authorize**, enter the General Manager email/password, and use `GET /api/v1/welcome` or `GET /api/v1/manager/users` to confirm access.
The live API documentation is at `/docs`; the health check is at `/api/v1/health`.

Render Free web services can spin down when idle. Database free-tier limits, expiry, backups, and connection restrictions depend on the provider you choose. Use a database plan with reliable backups before entering real guest, employee, or financial records. See [Render Free instance limits](https://render.com/docs/free), [Render Blueprint reference](https://render.com/docs/blueprint-spec), and [Render FastAPI deploy guide](https://render.com/docs/deploy-fastapi).

## Important limitations before production

- The bootstrap command creates tables for a fresh database. Use versioned Alembic migrations before deploying schema changes to production.
- Room conflict checking is implemented in application logic; high-concurrency production booking needs a database-level exclusion/locking strategy to prevent two simultaneous requests from reserving the same room.
- Report totals are grouped by original currency. Exchange-rate capture and SLE conversion, receipt uploads, inventory workflows, HR records, and full department-specific screens are not implemented yet.
- Shift schedules and clock records are implemented, but automated overtime rules, leave, absence reasons, payroll integration, and manager correction workflows are not.
- The first increment records payments but does not yet provide refund/void workflows or accounting-ledger reconciliation.
- Production deployment also needs HTTPS, a managed secret store, database and document backups, restore checks, monitoring, and a General Manager recovery procedure.

## Design reference

See [`../docs/SYSTEM_DESIGN.md`](../docs/SYSTEM_DESIGN.md) for the full product requirements and target data model.
