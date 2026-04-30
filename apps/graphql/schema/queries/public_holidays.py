import json
from pathlib import Path

import strawberry

from graphql.schema.types import PublicHolidayType

HOLIDAYS_DIR = Path(__file__).resolve().parent.parent.parent / "data_sources" / "holidays"
COUNTRY_TO_HOLIDAY_KEY = {
    "id": "indonesia",
    "indonesia": "indonesia",
    "de": "germany",
    "germany": "germany",
}


@strawberry.type
class PublicHolidaysQuery:
    @strawberry.field
    def public_holidays(
        self,
        country: str,
        start_date: str,
        end_date: str,
    ) -> list[PublicHolidayType]:
        country_key = COUNTRY_TO_HOLIDAY_KEY.get(country.strip().lower(), country.strip().lower())
        path = HOLIDAYS_DIR / f"{country_key}.json"
        if not path.exists():
            return []
        entries = json.loads(path.read_text())
        return [PublicHolidayType(**e) for e in entries if start_date <= e["date"] <= end_date]
