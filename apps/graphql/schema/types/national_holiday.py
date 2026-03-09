import strawberry


@strawberry.type
class NationalHolidayType:
    date: str
    name: str
    localName: str
    holidayType: str
    isPublicHoliday: bool
    isTentative: bool
