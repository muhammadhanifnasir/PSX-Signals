import os
import logging
from typing import Optional, Dict, Any, List
from backend.app.config import settings

logger = logging.getLogger("supabase_client")

class SupabaseService:
    def __init__(self):
        self.url = settings.SUPABASE_URL
        self.key = settings.SUPABASE_KEY
        self.is_connected = False
        self._client = None
        self._initialize()

    def _initialize(self):
        if not self.url or not self.key or "placeholder" in self.url.lower():
            logger.info("Supabase credentials not configured. Running with local storage mode.")
            self.is_connected = False
            return
        try:
            # We attempt importing supabase-py if installed
            from supabase import create_client, Client
            self._client: Client = create_client(self.url, self.key)
            self.is_connected = True
            logger.info("Supabase client initialized successfully.")
        except Exception as e:
            logger.warning(f"Could not connect to Supabase: {e}. Fallback to simulated database.")
            self.is_connected = False

    def get_status(self) -> Dict[str, Any]:
        return {
            "connected": self.is_connected,
            "url_configured": bool(self.url and "placeholder" not in self.url.lower()),
            "mode": "SUPABASE_POSTGRES" if self.is_connected else "SIMULATED_IN_MEMORY"
        }

supabase_service = SupabaseService()
