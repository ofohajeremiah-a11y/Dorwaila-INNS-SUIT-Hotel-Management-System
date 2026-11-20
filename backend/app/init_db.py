"""Create missing database tables for the initial demo deployment.

This is idempotent for existing tables, but it is not a schema migration tool.
Use Alembic migrations for future schema changes before production use.
"""

from app.database import Base, engine
from app import models  # noqa: F401


def main() -> None:
    Base.metadata.create_all(bind=engine)
    print("Database table check completed.")


if __name__ == "__main__":
    main()
