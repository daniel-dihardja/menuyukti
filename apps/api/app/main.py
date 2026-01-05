from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.concurrency import run_in_threadpool

from .analytics.pos_detector import detect_pos_from_excel_bytes
from .analytics.registry import NORMALIZERS


app = FastAPI(title="Menuyukti Analytics API")


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()

    # 1. Detect POS (blocking → threadpool)
    pos = await run_in_threadpool(detect_pos_from_excel_bytes, contents)

    if not pos or pos == "unknown":
        raise HTTPException(status_code=422, detail="Unsupported POS")

    # 2. Select normalizer
    normalizer = NORMALIZERS.get(pos)
    if not normalizer:
        raise HTTPException(
            status_code=501,
            detail=f"No normalizer implemented for POS '{pos}'",
        )

    # 3. Normalize
    try:
        df = await run_in_threadpool(normalizer, contents)
        print(df.head())
    except Exception:
        raise HTTPException(status_code=422, detail="Failed to normalize file")

    # 5. Respond (temporary)
    return {"status": "ok", "pos": pos}
