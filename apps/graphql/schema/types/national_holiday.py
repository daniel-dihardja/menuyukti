import strawberry


@strawberry.type
class NationalHolidayType:
    id: str
    date: str
    name: str
    localName: str
    holidayType: str
    isTentative: bool
