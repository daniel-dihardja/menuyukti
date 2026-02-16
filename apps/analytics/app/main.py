from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import Any, List, Optional
from decimal import Decimal

import pandas as pd

from marketing_engine.core.analytics.extract_menu_items import extract_menu_items
from marketing_engine.core.analytics.pos_detector import detect_pos_from_excel_bytes
from marketing_engine.core.analytics.registry import NORMALIZERS
from marketing_engine.core.analytics.esb.normalizer import (
    normalize_esb_excel_with_rejections,
)
from marketing_engine.core.analytics.calculate_sales_analytics import (
    calculate_sales_analytics,
)
from marketing_engine.core.analytics.calculate_menu_engineering_matrix import (
    calculate_menu_engineering_matrix,
)
from marketing_engine.pipeline import build_promotion_candidates
from marketing_engine.decision.allocation.promotion_scheduler import PromotionScheduler
from marketing_engine.core.models.matrix_item import MatrixItem
from marketing_engine.core.models.heatmap import MenuHeatmap
from marketing_engine.core.models.matrix_distribution import MatrixDistribution
from marketing_engine.core.contracts import (
    build_metadata_v1,
    to_core_distribution,
    to_core_heatmap,
    to_core_matrix_item,
)


app = FastAPI(title="Menuyukti Analytics API")

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

    return {
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


# ==================================================
# Intelligence pipeline endpoint
# ==================================================


class DecisionPipelineRequest(BaseModel):
    matrix_items: List[dict[str, Any]]
    heatmaps: List[dict[str, Any]]
    distribution: dict[str, Any]


@app.post("/decision/pipeline")
async def run_decision_pipeline(payload: DecisionPipelineRequest):
    if not payload.matrix_items:
        raise HTTPException(status_code=400, detail="NO_MATRIX_ITEMS")

    if not payload.heatmaps:
        raise HTTPException(status_code=400, detail="NO_HEATMAPS")

    try:
        matrix_items: list[MatrixItem] = [
            to_core_matrix_item(item) for item in payload.matrix_items
        ]
        heatmaps: list[MenuHeatmap] = [to_core_heatmap(hm) for hm in payload.heatmaps]
        distribution: MatrixDistribution = to_core_distribution(payload.distribution)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"INVALID_PIPELINE_PAYLOAD: {e}")

    portfolio, candidates = build_promotion_candidates(
        matrix_items=matrix_items,
        heatmaps=heatmaps,
        distribution=distribution,
    )

    scheduler = PromotionScheduler()
    schedule = scheduler.build_weekly_schedule(candidates)

    return {
        "status": "ok",
        "metadata": build_metadata_v1(source_system="api"),
        "insights": {
            "portfolio": portfolio.model_dump(),
            "candidates": [c.model_dump() for c in candidates],
            "schedule": [s.model_dump() for s in schedule],
        },
    }
