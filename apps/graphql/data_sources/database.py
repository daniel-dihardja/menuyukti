"""Database helpers for the GraphQL service."""

from pathlib import Path
import os

from dotenv import load_dotenv

from sqlalchemy import Column, DateTime, Integer, String, create_engine, func
from sqlalchemy.orm import declarative_base, sessionmaker


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", override=False)

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite+pysqlite:///./graphql.db")

engine = create_engine(DATABASE_URL, future=True, echo=False)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(320), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


def init_db(target_engine=None) -> None:
    """Create tables for all models (defaults to the configured engine)."""

    resolved_engine = target_engine or engine
    Base.metadata.create_all(bind=resolved_engine)


def main() -> None:
    """Entry point so the schema can be quickly bootstrapped."""

    init_db()
    print("Created tables for the GraphQL service.")


if __name__ == "__main__":
    main()
