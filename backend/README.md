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

## Temporary free deployment on Render

The root `render.yaml` configures a Render Free web service using SQLite. You do not need a Neon account or a separate PostgreSQL database for this temporary demonstration. The Blueprint generates `SECRET_KEY` and asks you to supply the first General Manager email and password as private environment values.

1. Push this project to GitHub. Do not upload or commit `.env`, passwords, database URLs, signing keys, or other credentials.
2. In Render, choose **New → Blueprint**, connect this GitHub repository, and review the `render.yaml` configuration. Select the **Free** instance if asked.
3. When Render asks for `BOOTSTRAP_GM_EMAIL` and `BOOTSTRAP_GM_PASSWORD`, enter the General Manager login details directly in Render. Use a password of at least 12 characters. Do not send these values in chat or commit them to GitHub. The name defaults to General Manager.
4. Deploy the Blueprint. Startup creates the SQLite tables and creates the first General Manager account only if the database has no users.
5. Open `https://YOUR-SERVICE.onrender.com/api/v1/health`; a successful response is `{"status":"ok"}`. Open `https://YOUR-SERVICE.onrender.com/docs` for the interactive API documentation.
6. In `/docs`, click **Authorize** and sign in with the General Manager email and password you entered in Render.

**Temporary-storage warning:** Render Free uses an ephemeral filesystem. SQLite records can disappear after a restart, redeploy, or instance replacement. This setup is for a short demonstration only, not real guest, employee, or financial records. The service may also spin down when idle.

## Important scope and production notes

This is a deployable **API starter**, not a finished hotel dashboard or a production-certified hotel platform. Before entering real guest, employee, or financial records, add versioned Alembic database migrations, database-level protection against simultaneous room double-bookings, backups and restore testing, monitoring, and a documented account-recovery process. Additional workflows such as inventory, full HR/payroll, refunds, and accounting reconciliation are not included in this first increment. Review `backend/README.md` for more detail.
