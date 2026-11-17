import os
import time
import logging
from typing import Dict, List, Tuple
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger("rate_limiter")

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 120):
        super().__init__(app)
        # Allow env override
        self.limit = int(os.getenv("RATE_LIMIT_PER_MINUTE", requests_per_minute))
        self.window = 60.0  # 60 seconds sliding window
        # Map: ip -> list of timestamps
        self.clients: Dict[str, List[float]] = {}
        self.last_cleanup = time.time()

    def _get_client_ip(self, request: Request) -> str:
        # Check standard reverse proxy headers
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
        if request.client:
            return request.client.host
        return "127.0.0.1"

    def _cleanup_old_records(self, now: float):
        if now - self.last_cleanup > 300.0:  # Every 5 minutes
            cutoff = now - self.window
            for ip in list(self.clients.keys()):
                self.clients[ip] = [t for t in self.clients[ip] if t > cutoff]
                if not self.clients[ip]:
                    del self.clients[ip]
            self.last_cleanup = now

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # Bypass rate limiting for websockets, health probes, docs
        if (
            path.startswith("/ws")
            or path.startswith("/api/health")
            or path in ["/health", "/docs", "/redoc", "/openapi.json", "/"]
        ):
            return await call_next(request)

        now = time.time()
        self._cleanup_old_records(now)

        client_ip = self._get_client_ip(request)
        cutoff = now - self.window

        timestamps = self.clients.get(client_ip, [])
        valid_timestamps = [t for t in timestamps if t > cutoff]

        remaining = max(0, self.limit - len(valid_timestamps))
        reset_in = int(self.window - (now - valid_timestamps[0])) if valid_timestamps else 60

        if len(valid_timestamps) >= self.limit:
            logger.warning(f"Rate limit exceeded for client {client_ip} on {path}")
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "API rate limit exceeded. Please throttle requests.",
                    "limit_per_minute": self.limit,
                    "retry_after_seconds": max(1, reset_in),
                },
                headers={
                    "Retry-After": str(max(1, reset_in)),
                    "X-RateLimit-Limit": str(self.limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(max(1, reset_in)),
                },
            )

        # Record this request
        valid_timestamps.append(now)
        self.clients[client_ip] = valid_timestamps

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining - 1 if remaining > 0 else 0)
        response.headers["X-RateLimit-Reset"] = str(max(1, reset_in))
        return response
