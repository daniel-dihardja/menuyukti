from fastapi import FastAPI, Body
from pydantic import BaseModel
from typing import Dict, Any

app = FastAPI(title="Menuyukti Analytics API")


class AnalyticsPayload(BaseModel):
    data: Dict[str, Any]


@app.post("/upload")
async def upload_data(payload: AnalyticsPayload = Body(...)):
    print("Received analytics payload")
    return {"status": "ok"}
