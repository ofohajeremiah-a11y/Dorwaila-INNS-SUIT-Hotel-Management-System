# Dorwaila INN's & SUIT Hotel Management System

This repository contains the **FastAPI backend/API** for the Dorwaila INN's & SUIT Hotel Management System. It is not yet a complete browser-based hotel dashboard: there is no React, Vue, or other frontend application in this project. The deployed service provides a REST API and interactive API documentation.

## Main backend capabilities

- Authentication with bearer access tokens
- General Manager account administration
- Department users and permissions
- Room and reservation management
- Reservation payments
- Department activity records
- Shift scheduling and attendance
- Expense submission and approval
- General Manager reports and audit history

## Technology

- Python 3.12+
- FastAPI and Uvicorn
- SQLAlchemy
- PostgreSQL for shared deployment / SQLite for local testing
- Pydantic Settings
- JWT authentication and Argon2 password hashing

## Project layout

- `backend/app/` — API application, models, schemas, security and database setup
- `backend/requirements.txt` — Python dependencies
- `backend/.env.example` — sample local environment configuration
- `backend/Dockerfile` and `backend/compose.yaml` — local Docker setup
- `render.yaml` — Render Blueprint configuration
- `docs/SYSTEM_DESIGN.md` — system design documentation

## Local setup (Windows PowerShell)

Open PowerShell in the project root and run:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
Copy-Item .env.example .env
```

Edit `backend/.env` and set a unique `SECRET_KEY` (at least 32 characters). For a simple local SQLite database, use:

```env
DATABASE_URL=sqlite:///./dorwaila_dev.db
```

Then install and start:

```powershell
python -m pip install -r requirements.txt
python -m app.init_db
```

Create the first General Manager account using the one-time PowerShell instructions in `backend/README.md`, then run:

```powershell
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs` to use and test the API.

## Deploy to Render with PostgreSQL

The root `render.yaml` creates a Render web service. It deliberately does **not** create a Render database automatically; you provide a PostgreSQL connection string, for example from Neon or another PostgreSQL provider. This avoids silently selecting a database plan that may not be available on your Render account.

1. Push this project to GitHub. Do not upload or commit `.env`, passwords, database URLs, signing keys, or other credentials.
2. Create a PostgreSQL database with your chosen provider and copy its connection string. Keep it private. The URL should begin with `postgresql://` or `postgres://`; the app normalizes these to the psycopg SQLAlchemy driver.
3. In Render, choose **New → Blueprint**, connect the GitHub repository, and apply the `render.yaml` configuration.
4. In the Render service's Environment settings, add `DATABASE_URL` and paste the PostgreSQL connection string. Render generates `SECRET_KEY` from the Blueprint. Keep it private and do not replace it with a public value.
5. Wait for deployment to finish. The start command initializes missing tables for this initial project version and then starts Uvicorn.
6. Open `https://YOUR-SERVICE.onrender.com/api/v1/health`. A successful response is `{"status":"ok"}`. Open `https://YOUR-SERVICE.onrender.com/docs` for the API documentation.
7. Create the first General Manager account once. Use the external PostgreSQL connection string in a local PowerShell session, from the `backend` folder, and follow the exact bootstrap commands in `backend/README.md`. Do not share the database URL or General Manager password in chat or commit them to GitHub.
8. Return to `/docs`, click **Authorize**, and sign in with the General Manager email and password.

The Render free web service may spin down when idle. Check current Render and database-provider limits before relying on the service. Free database tiers may have storage, expiry, backup, and connection restrictions.

## Important scope and production notes

This is a deployable **API starter**, not a finished hotel dashboard or a production-certified hotel platform. Before entering real guest, employee, or financial records, add versioned Alembic database migrations, database-level protection against simultaneous room double-bookings, backups and restore testing, monitoring, and a documented account-recovery process. Additional workflows such as inventory, full HR/payroll, refunds, and accounting reconciliation are not included in this first increment. Review `backend/README.md` for more detail.
