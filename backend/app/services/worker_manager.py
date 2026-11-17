import asyncio
import os
import time
import logging
import datetime
import traceback
from typing import Dict, Any, List, Optional

from backend.app.market_engine.engine import market_data_engine
from backend.app.scanner.background_scanner import background_scanner
from backend.app.scanner.scanner_engine import scanner_engine
from backend.app.signals.background_signals import background_signals
from backend.app.signals.engine import signal_engine
from backend.app.services.supabase_client import supabase_service

logger = logging.getLogger("worker_manager")

class SystemWorkerManager:
    """
    Centralized Background Worker & Scheduler Manager.
    Coordinates market data collection, scanner cycles, signal generation,
    freshness auditing, and structured error reporting.
    """
    def __init__(self):
        self.started_at: float = time.time()
        self.is_running: bool = False
        self.error_log_buffer: List[Dict[str, Any]] = []
        self.worker_metrics: Dict[str, Dict[str, Any]] = {
            "market_data_collector": {"cycles": 0, "errors": 0, "last_run": None, "status": "INITIALIZED"},
            "market_scanner": {"cycles": 0, "errors": 0, "last_run": None, "status": "INITIALIZED"},
            "signal_engine": {"cycles": 0, "errors": 0, "last_run": None, "status": "INITIALIZED"},
        }

    def record_error(self, worker_name: str, error: Exception):
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry = {
            "timestamp": now_str,
            "worker": worker_name,
            "error_type": type(error).__name__,
            "message": str(error),
            "traceback": traceback.format_exc(limit=3),
        }
        self.error_log_buffer.append(entry)
        if len(self.error_log_buffer) > 50:
            self.error_log_buffer.pop(0)

        if worker_name in self.worker_metrics:
            self.worker_metrics[worker_name]["errors"] += 1

    def record_cycle(self, worker_name: str):
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if worker_name in self.worker_metrics:
            self.worker_metrics[worker_name]["cycles"] += 1
            self.worker_metrics[worker_name]["last_run"] = now_str
            self.worker_metrics[worker_name]["status"] = "HEALTHY"

    async def start_all(self):
        if self.is_running:
            return
        self.is_running = True
        logger.info("Initializing PSX Production Worker Manager...")

        try:
            # 1. Market Data Collector
            self.worker_metrics["market_data_collector"]["status"] = "STARTING"
            await market_data_engine.start_background_collector()
            self.worker_metrics["market_data_collector"]["status"] = "RUNNING"
            logger.info("-> Market Data Collector: ACTIVE")
        except Exception as e:
            self.record_error("market_data_collector", e)
            self.worker_metrics["market_data_collector"]["status"] = "ERROR"

        try:
            # 2. Automated Scanner Service
            self.worker_metrics["market_scanner"]["status"] = "STARTING"
            await background_scanner.start()
            self.worker_metrics["market_scanner"]["status"] = "RUNNING"
            logger.info("-> Automated Market Scanner: ACTIVE")
        except Exception as e:
            self.record_error("market_scanner", e)
            self.worker_metrics["market_scanner"]["status"] = "ERROR"

        try:
            # 3. Automated Signal Engine Service
            self.worker_metrics["signal_engine"]["status"] = "STARTING"
            await background_signals.start()
            self.worker_metrics["signal_engine"]["status"] = "RUNNING"
            logger.info("-> Automated Signal Engine: ACTIVE")
        except Exception as e:
            self.record_error("signal_engine", e)
            self.worker_metrics["signal_engine"]["status"] = "ERROR"

    def stop_all(self):
        logger.info("Stopping all background workers...")
        self.is_running = False

        try:
            background_signals.stop()
            self.worker_metrics["signal_engine"]["status"] = "STOPPED"
        except Exception as e:
            logger.error(f"Error stopping signal worker: {e}")

        try:
            background_scanner.stop()
            self.worker_metrics["market_scanner"]["status"] = "STOPPED"
        except Exception as e:
            logger.error(f"Error stopping scanner: {e}")

        try:
            market_data_engine.stop_background_collector()
            self.worker_metrics["market_data_collector"]["status"] = "STOPPED"
        except Exception as e:
            logger.error(f"Error stopping market collector: {e}")

    def get_system_health(self) -> Dict[str, Any]:
        uptime_sec = int(time.time() - self.started_at)
        days, rem = divmod(uptime_sec, 86400)
        hours, rem = divmod(rem, 3600)
        minutes, seconds = divmod(rem, 60)
        uptime_formatted = f"{days}d {hours}h {minutes}m {seconds}s"

        data_sources_status = market_data_engine.get_data_sources_status()

        # Determine overall health status
        all_workers_healthy = all(
            m["status"] in ["RUNNING", "HEALTHY"]
            for m in self.worker_metrics.values()
        )
        has_critical_errors = len([e for e in self.error_log_buffer if "Critical" in e["message"]]) > 0

        status_label = "HEALTHY"
        if not all_workers_healthy or has_critical_errors:
            status_label = "DEGRADED"

        return {
            "status": status_label,
            "version": "1.0.0",
            "uptime_seconds": uptime_sec,
            "uptime_human": uptime_formatted,
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "pid": os.getpid(),
            "workers": self.worker_metrics,
            "market_data_engine": data_sources_status,
            "database": supabase_service.get_status(),
            "recent_errors_count": len(self.error_log_buffer),
            "recent_errors": self.error_log_buffer[-5:],
        }

    async def trigger_manual_scan(self) -> Dict[str, Any]:
        """Trigger an on-demand market scan outside scheduled intervals."""
        summary = await scanner_engine.scan_market()
        self.record_cycle("market_scanner")
        return summary.model_dump() if summary else {"status": "completed"}

    async def trigger_manual_signals(self) -> Dict[str, Any]:
        """Trigger an on-demand signal engine generation pass."""
        signals = await signal_engine.generate_signals()
        self.record_cycle("signal_engine")
        return {"status": "completed", "signals_evaluated": len(signals)}

worker_manager = SystemWorkerManager()
