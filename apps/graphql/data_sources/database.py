"""Database helpers for the GraphQL service."""

from pathlib import Path
import os

from dotenv import load_dotenv

from sqlalchemy import Column, DateTime, Float, Integer, String, create_engine, func
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


class OrderFact(Base):
    __tablename__ = "order_fact"

    id = Column(Integer, primary_key=True)
    bill_number = Column(String(64), nullable=False, index=True)
    menu = Column(String(256), nullable=False)
    qty = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    total_after_bill_discount = Column(Float, nullable=False)
    order_time = Column(DateTime(timezone=True), nullable=False, index=True)
    menu_category = Column(String(128), nullable=False)
    menu_category_detail = Column(String(128), nullable=False)
    pos_system = Column(String(64), nullable=False, default="unknown")


def init_db(target_engine=None) -> None:
    """Create tables for all models (defaults to the configured engine)."""

    resolved_engine = target_engine or engine
    Base.metadata.create_all(bind=resolved_engine)


def drop_db(target_engine=None) -> None:
    """Drop all tables for the configured models."""

    resolved_engine = target_engine or engine
    Base.metadata.drop_all(bind=resolved_engine)


def main() -> None:
    """Entry point so the schema can be quickly bootstrapped."""

    init_db()
    print("Created tables for the GraphQL service.")


def _main_drop() -> None:
    """Drop tables via the same module entry point."""

    drop_db()
    print("Dropped all GraphQL tables.")


if __name__ == "__main__":
    import sys

    action = sys.argv[1] if len(sys.argv) > 1 else "init"

    if action == "drop":
        _main_drop()
    else:
        main()
