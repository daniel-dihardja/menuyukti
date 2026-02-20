from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import Any, List, Optional
from decimal import Decimal
import math

import pandas as pd

from menuyukti.indicators.utils.extraction import extract_menu_items
from menuyukti.indicators.utils.pos import detect_pos_from_excel_bytes
from menuyukti.indicators.utils.registry import NORMALIZERS
from menuyukti.indicators.analytics.esb.normalizer import (
    normalize_esb_excel,
)
from menuyukti.indicators.analytics.sales import (
    calculate_sales_analytics,
)
from menuyukti.indicators.analytics.menu_engineering import (
    calculate_menu_engineering_matrix,
)
from menuyukti.indicators.contracts import (
    build_metadata_v1,
)


app = FastAPI(title="Menuyukti Analytics API")


def sanitize_json_payload(value: Any) -> Any:
    # JSON spec does not allow NaN/Inf; normalize all payload values recursively.
    if isinstance(value, float):
        return value if math.isfinite(value) else None

    if isinstance(value, Decimal):
        return float(value) if value.is_finite() else None

    if isinstance(value, dict):
        return {key: sanitize_json_payload(item) for key, item in value.items()}

    if isinstance(value, list):
        return [sanitize_json_payload(item) for item in value]

    if hasattr(value, "item") and callable(value.item):
        try:
            return sanitize_json_payload(value.item())
        except Exception:
            return value

    try:
        if pd.isna(value):
            return None
    except Exception:
        pass

    return value


# ==================================================
# Existing Excel-based analytics endpoint
# ==================================================


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
        rejected_df = pd.DataFrame()
        if pos == "esb":
            df, rejected_df = await run_in_threadpool(
                normalize_esb_excel_with_rejections,
                contents,
            )
        else:
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

    # 4. Sales analytics
    try:
        analytics = await run_in_threadpool(calculate_sales_analytics, df)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to calculate analytics",
        )

    # 5. Menu items
    menu_items = extract_menu_items(df)
    rejected_rows = []
    if not rejected_df.empty:
        rejected_rows = [
            {
                "row_data": row.drop(labels=["rejection_reason"]).to_dict(),
                "rejection_reason": str(row["rejection_reason"]),
            }
            for _, row in rejected_df.iterrows()
        ]

    payload = {
        "status": "ok",
        "metadata": build_metadata_v1(source_system=pos),
        "pos": pos,
        "menu_items": menu_items,
        "analytics": analytics,
        "staging": {
            "raw_rows": df.to_dict(orient="records"),
            "rejected_rows": rejected_rows,
        },
    }
    return sanitize_json_payload(payload)


# ==================================================
# Menu Engineering Matrix endpoint
# ==================================================


class AnalyticsMenuItemIn(BaseModel):
    menu_name: str = Field(..., min_length=1)
    quantity: int = Field(..., ge=0)
    total_revenue: Decimal = Field(..., ge=0)
    cogs: Optional[Decimal] = Field(None, ge=0)
    menu_category: Optional[str] = None
    menu_category_detail: Optional[str] = None


class MenuItemsMatrixRequest(BaseModel):
    items: List[AnalyticsMenuItemIn]


@app.post("/menu-items/matrix")
async def calculate_matrix(payload: MenuItemsMatrixRequest):
    if not payload.items:
        raise HTTPException(status_code=400, detail="NO_MENU_ITEMS")

    df = pd.DataFrame([item.model_dump() for item in payload.items])

    df.rename(columns={"menu_name": "menu"}, inplace=True)

    df["quantity"] = df["quantity"].astype(int)
    df["total_revenue"] = df["total_revenue"].astype(float)

    if "cogs" in df.columns:
        df["cogs"] = df["cogs"].astype(float)

    try:
        matrix = await run_in_threadpool(calculate_menu_engineering_matrix, df)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to calculate menu matrix",
        )

    return {
        "status": "ok",
        "metadata": build_metadata_v1(source_system="api"),
        "matrix": matrix,
    }
