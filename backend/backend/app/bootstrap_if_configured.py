"""Create the first General Manager on initial deployment when credentials are configured.

This command is safe to run on every service start: it creates an account only
when all bootstrap values are present and the database contains no users.
"""
import os

from sqlalchemy import func, select

from app.database import Base, SessionLocal, engine
from app import models  # noqa: F401
from app.models import DepartmentCode, User
from app.security import hash_password


def main() -> None:
    Base.metadata.create_all(bind=engine)
    email = os.environ.get("BOOTSTRAP_GM_EMAIL", "").strip().lower()
    name = os.environ.get("BOOTSTRAP_GM_NAME", "General Manager").strip() or "General Manager"
    password = os.environ.get("BOOTSTRAP_GM_PASSWORD", "")

    if not email or len(password) < 12:
        print("Initial General Manager not created: configure BOOTSTRAP_GM_EMAIL and a BOOTSTRAP_GM_PASSWORD of at least 12 characters in Render.")
        return

    with SessionLocal() as db:
        existing_users = db.scalar(select(func.count(User.id))) or 0
        if existing_users:
            print("General Manager bootstrap skipped: the database already contains user accounts.")
            return
        db.add(User(
            email=email,
            full_name=name,
            password_hash=hash_password(password),
            department=DepartmentCode.general_manager,
            is_admin=True,
            is_active=True,
        ))
        db.commit()

    print("Initial General Manager account created.")


if __name__ == "__main__":
    main()
