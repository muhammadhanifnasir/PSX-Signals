from fastapi import APIRouter
from backend.app.models.market import MarketStatusResponse, MarketMoversResponse
from backend.app.services.mock_data import mock_service

router = APIRouter(prefix="/market", tags=["Market"])

@router.get("/status", response_model=MarketStatusResponse)
async def get_market_status():
    """Retrieve real-time PSX market status and KSE-100 metrics."""
    return mock_service.get_market_status()

@router.get("/movers", response_model=MarketMoversResponse)
async def get_market_movers():
    """Retrieve top gainers, losers, and volume leaders."""
    return mock_service.get_market_movers()
