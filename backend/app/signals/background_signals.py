import asyncio
import logging
from backend.app.signals.engine import signal_engine

logger = logging.getLogger("background_signals")

class BackgroundSignalsWorker:
    def __init__(self, interval_seconds: int = 60):
        self.interval_seconds = interval_seconds
        self.is_running = False
        self._task = None

    async def start(self):
        if self.is_running:
            return
        self.is_running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info(f"Background trading signal worker started (Interval: {self.interval_seconds}s).")

    def stop(self):
        if not self.is_running:
            return
        self.is_running = False
        if self._task:
            self._task.cancel()
        logger.info("Background trading signal worker stopped.")

    async def _run_loop(self):
        # Initial delay to allow market data engine startup
        await asyncio.sleep(8)
        while self.is_running:
            try:
                await signal_engine.generate_signals()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in background signal run: {e}")

            try:
                await asyncio.sleep(self.interval_seconds)
            except asyncio.CancelledError:
                break

background_signals = BackgroundSignalsWorker(interval_seconds=60)
