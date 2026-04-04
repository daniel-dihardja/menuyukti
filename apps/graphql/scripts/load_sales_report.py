import argparse
import sys
from datetime import datetime
from pathlib import Path

from graphql.data_sources import AnalyticsRun, Location, SessionLocal, drop_db, init_db
from graphql.reports import normalize_sales_report, persist_sales_report


def main(excel_path: str) -> int:
    path = Path(excel_path)
    if not path.exists():
        print(f"ERROR: file not found: {path}")
        return 1

    drop_db()
    init_db()

    payload = path.read_bytes()
    normalized_rows, detected_pos = normalize_sales_report(payload)

    session = SessionLocal()
    try:
        # Ensure a default location exists for CLI ingestion
        location = session.query(Location).order_by(Location.id).first()
        if location is None:
            location = Location(name="CLI Default")
            session.add(location)
            session.commit()
            session.refresh(location)

        period_start: datetime | None = None
        period_end: datetime | None = None
        if normalized_rows:
            times = [
                row.orderTime
                if isinstance(row.orderTime, datetime)
                else datetime.fromisoformat(str(row.orderTime))
                for row in normalized_rows
            ]
            period_start = min(times)
            period_end = max(times)

        analytics_run = AnalyticsRun(
            name=path.name,
            filename=path.name,
            pos_system=detected_pos,
            period_start=period_start.date() if period_start else None,
            period_end=period_end.date() if period_end else None,
            location_id=location.id,
        )
        session.add(analytics_run)
        session.commit()
        session.refresh(analytics_run)
        analytics_run_id = analytics_run.id
    finally:
        session.close()

    persist_sales_report(
        normalized_rows,
        detected_pos,
        analytics_run_id=analytics_run_id,
    )

    print(f"Loaded {len(normalized_rows)} rows from {path} into the database.")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Load a sales report Excel file into order_fact."
    )
    parser.add_argument("path", help="Path to the Excel file to ingest")
    args = parser.parse_args()

    sys.exit(main(args.path))
