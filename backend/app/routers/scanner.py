from fastapi import APIRouter, Query
from typing import Optional
from backend.app.models.scanner import ScannerResponse
from backend.app.services.mock_data import mock_service

router = APIRouter(prefix="/scanner", tags=["Market Scanner"])

@router.get("", response_model=ScannerResponse)
async def get_scanner_results(
    pattern: Optional[str] = Query(None, description="Filter by detected pattern"),
    min_score: int = Query(70, ge=0, le=100, description="Minimum confidence score")
):
    """Retrieve filtered real-time market scan results."""
    scan = mock_service.get_scanner_results()
    results = [r for r in scan.results if r.confidence_score >= min_score]
    if pattern:
        results = [r for r in results if pattern.lower() in r.detected_pattern.lower()]
    
    return ScannerResponse(
        total_scanned=scan.total_scanned,
        matches_count=len(results),
        scan_timestamp=scan.scan_timestamp,
        filters_applied={"min_score": min_score, "pattern": pattern},
        results=results,
        is_mock=True
    )

@router.post("/run", response_model=ScannerResponse)
async def run_scan_now():
    """Trigger an immediate real-time scan across all listed PSX equities."""
    return mock_service.get_scanner_results()
