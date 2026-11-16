import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.routers import market, signals, scanner, opportunities, stocks, websocket
from backend.app.services.supabase_client import supabase_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("psx_signal_intelligence")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Professional PSX stock-market scanning and automated trading-signal research API.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(market.router, prefix=settings.API_V1_PREFIX)
app.include_router(signals.router, prefix=settings.API_V1_PREFIX)
app.include_router(scanner.router, prefix=settings.API_V1_PREFIX)
app.include_router(opportunities.router, prefix=settings.API_V1_PREFIX)
app.include_router(stocks.router, prefix=settings.API_V1_PREFIX)
app.include_router(websocket.router)

@app.get("/api/health", tags=["Health"])
async def health_check():
    """System health check and connection status."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "data_mode": settings.DATA_MODE,
        "database": supabase_service.get_status(),
        "disclaimer": settings.MOCK_DISCLAIMER
    }

@app.get("/", tags=["Root"])
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "status": "online",
        "docs": "/docs",
        "api_v1": settings.API_V1_PREFIX,
        "is_mock": True,
        "disclaimer": settings.MOCK_DISCLAIMER
    }
