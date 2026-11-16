from fastapi import APIRouter
from backend.app.models.scanner import OpportunitiesResponse
from backend.app.services.mock_data import mock_service

router = APIRouter(prefix="/opportunities", tags=["Opportunities"])

@router.get("", response_model=OpportunitiesResponse)
async def get_top_opportunities():
    """Retrieve top high-probability trading opportunities with risk/reward metrics."""
    return mock_service.get_top_opportunities()
