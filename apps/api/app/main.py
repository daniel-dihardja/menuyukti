from fastapi import FastAPI, UploadFile, File
from .pos_detector import detect_pos_from_excel_bytes

app = FastAPI(title="Menuyukti Analytics API")


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()

    pos = detect_pos_from_excel_bytes(contents)

    return {
        "status": "ok",
        "pos": pos,
    }
