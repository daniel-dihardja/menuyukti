from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.concurrency import run_in_threadpool

from .analytics.extract_menu_items import extract_menu_items

from .analytics.pos_detector import detect_pos_from_excel_bytes
from .analytics.registry import NORMALIZERS
from .analytics.calculate_sales_analytics import calculate_sales_analytics


app = FastAPI(title="Menuyukti Analytics API")


@app.post("/analyse")
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()

    # 1. Detect POS
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
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to normalize file")

    if df.empty:
        raise HTTPException(
            status_code=422,
            detail="No valid rows after normalization",
        )

    # 4. Analytics
    try:
        analytics = await run_in_threadpool(calculate_sales_analytics, df)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to calculate analytics")

    # 5. Menu items (entities, not analytics)
    menu_items = extract_menu_items(df)

    # 6. Final response
    return {
        "status": "ok",
        "pos": pos,
        "menu_items": menu_items,
        "analytics": analytics,
    }
