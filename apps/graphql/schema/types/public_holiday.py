import strawberry


@strawberry.type
class PublicHolidayType:
    id: str
    date: str
    name: str
    localName: str
    holidayType: str
    isTentative: bool
