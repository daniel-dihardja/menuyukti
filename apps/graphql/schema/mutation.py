from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import strawberry
from openpyxl import load_workbook
from strawberry.file_uploads import Upload

ROOT_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


@strawberry.type
class ExcelUploadResult:
    filename: str
    stored_path: str
    sheet_names: list[str]
    header_preview: list[str]
    size_bytes: int


@strawberry.type
class Mutation:
    @strawberry.mutation
    async def upload_excel(self, file: Upload) -> ExcelUploadResult:
        payload = await file.read()
        stored_name = f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{uuid4().hex}_{file.filename}"
        stored_path = UPLOAD_DIR / stored_name
        stored_path.write_bytes(payload)

        workbook = load_workbook(filename=stored_path, read_only=True, data_only=True)
        sheet_names = workbook.sheetnames
        header_preview: list[str] = []

        if sheet_names:
            active_sheet = workbook[sheet_names[0]]
            first_row = next(active_sheet.iter_rows(max_row=1, values_only=True), ())
            header_preview = [str(value) if value is not None else "" for value in first_row]

        workbook.close()

        return ExcelUploadResult(
            filename=file.filename,
            stored_path=str(stored_path),
            sheet_names=sheet_names,
            header_preview=header_preview,
            size_bytes=len(payload),
        )
