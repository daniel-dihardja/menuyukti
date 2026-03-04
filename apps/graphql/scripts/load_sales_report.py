from pathlib import Path
import argparse
import sys

from graphql.data_sources import drop_db, init_db
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
    persist_sales_report(normalized_rows, detected_pos)

    print(f"Loaded {len(normalized_rows)} rows from {path} into the database.")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Load a sales report Excel file into order_fact."
    )
    parser.add_argument("path", help="Path to the Excel file to ingest")
    args = parser.parse_args()

    sys.exit(main(args.path))
