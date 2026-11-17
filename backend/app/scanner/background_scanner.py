import asyncio
import logging
from typing import Optional
from backend.app.scanner.scanner_engine import scanner_engine

logger = logging.getLogger("background_scanner")

class BackgroundScannerService:
    def __init__(self, interval_seconds: int = 60):
        self.interval_seconds = interval_seconds
        self.is_running = False
        self._task: Optional[asyncio.Task] = None

    async def start(self):
        if self.is_running:
            return

        self.is_running = True
        logger.info(f"Starting Background PSX Scanner Service (interval: {self.interval_seconds}s)...")

        # Initial immediate scan
        asyncio.create_task(self._safe_scan())

        async def _loop():
            while self.is_running:
                try:
                    await asyncio.sleep(self.interval_seconds)
                    if self.is_running:
                        await self._safe_scan()
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Error in background scanner iteration: {e}")
                    await asyncio.sleep(15)

        self._task = asyncio.create_task(_loop())

    async def _safe_scan(self):
        try:
            await scanner_engine.scan_market()
        except Exception as e:
            logger.error(f"Background market scan error: {e}")

    def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            self._task = None
        logger.info("Stopped Background PSX Scanner Service.")

background_scanner = BackgroundScannerService()
