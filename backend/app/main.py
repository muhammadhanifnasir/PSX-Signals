import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.routers import (
    market,
    signals,
    scanner,
    opportunities,
    stocks,
    websocket,
    market_data,
    watchlist,
    alerts,
    backtest,
    journal,
    auth,
)
from backend.app.services.supabase_client import supabase_service
from backend.app.services.worker_manager import worker_manager
from backend.app.middleware.rate_limit import RateLimitMiddleware
from backend.app.middleware.security_headers import SecurityHeadersMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("psx_signal_intelligence")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize worker manager (data engine, scanner, and signal workers)
    logger.info("Initializing PSX Production Services & Background Schedulers...")
    await worker_manager.start_all()
    yield
    # Shutdown: Stop all workers cleanly
    logger.info("Stopping all background services...")
    worker_manager.stop_all()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Professional PSX stock-market scanning and automated trading-signal research API.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# 1. Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# 2. Rate Limiting Middleware (120 req/min per IP with standard headers)
app.add_middleware(RateLimitMiddleware, requests_per_minute=120)

# 3. CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers with /api prefix AND directly for universal Vercel service rewrite compatibility
core_routers = [
    auth.router,
    scanner.router,
    market_data.router,
    market.router,
    signals.router,
    opportunities.router,
    stocks.router,
    watchlist.router,
    alerts.router,
    backtest.router,
    journal.router,
]

for r in core_routers:
    app.include_router(r, prefix=settings.API_V1_PREFIX)
    app.include_router(r)

app.include_router(websocket.router, prefix=settings.API_V1_PREFIX)
app.include_router(websocket.router)

# --- Production Health & Monitoring Endpoints ---

@app.get("/api/health", tags=["Health & Monitoring"])
@app.get("/health", tags=["Health & Monitoring"])
async def health_check():
    """System health check, worker status, memory, database, and data freshness."""
    health = worker_manager.get_system_health()
    return health

@app.get("/api/health/live", tags=["Health & Monitoring"])
@app.get("/health/live", tags=["Health & Monitoring"])
async def liveness_probe():
async def liveness_probe():
    """Kubernetes / Docker container liveness probe."""
    return {"status": "alive", "service": settings.PROJECT_NAME}

@app.get("/api/health/ready", tags=["Health & Monitoring"])
async def readiness_probe():
    """Readiness probe verifying background worker initialization."""
    return {
        "status": "ready" if worker_manager.is_running else "starting",
        "service": settings.PROJECT_NAME,
        "database": supabase_service.get_status()
    }

@app.get("/api/health/errors", tags=["Health & Monitoring"])
async def get_recent_errors():
    """Returns the buffer of recent background worker errors and audit events."""
    return {
        "count": len(worker_manager.error_log_buffer),
        "errors": worker_manager.error_log_buffer,
    }

@app.post("/api/health/trigger-scan", tags=["Health & Monitoring"])
async def trigger_manual_scan():
    """Manually triggers an immediate market scan pass."""
    return await worker_manager.trigger_manual_scan()

@app.post("/api/health/trigger-signals", tags=["Health & Monitoring"])
async def trigger_manual_signals():
    """Manually triggers an immediate signal generation pass."""
    return await worker_manager.trigger_manual_signals()

@app.get("/", tags=["Root"])
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "status": "online",
        "docs": "/docs",
        "api_v1": settings.API_V1_PREFIX,
        "market_scanner": "ACTIVE",
        "data_mode": settings.DATA_MODE,
        "disclaimer": settings.DISCLAIMER
    }
