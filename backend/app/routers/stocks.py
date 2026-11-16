from fastapi import APIRouter, HTTPException
from backend.app.models.stock import StockDetail
from backend.app.services.mock_data import mock_service

router = APIRouter(prefix="/stocks", tags=["Stocks & Charts"])

@router.get("/{symbol}", response_model=StockDetail)
async def get_stock_detail(symbol: str):
    """Retrieve full technical details and historical OHLCV candles for charts."""
    return mock_service.get_stock_detail(symbol)
