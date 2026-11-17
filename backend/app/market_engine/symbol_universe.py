import os
import json
import logging
from typing import List, Optional, Dict
from backend.app.market_engine.models import SymbolUniverseItem

logger = logging.getLogger("symbol_universe")

DEFAULT_UNIVERSE_PATH = "backend/data/symbol_universe.json"

class SymbolUniverseManager:
    def __init__(self, file_path: str = DEFAULT_UNIVERSE_PATH):
        self.file_path = file_path
        self.symbols_map: Dict[str, SymbolUniverseItem] = {}
        os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
        self.load_or_initialize()

    def load_or_initialize(self):
        if os.path.exists(self.file_path):
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.symbols_map = {item["symbol"]: SymbolUniverseItem(**item) for item in data}
                    logger.info(f"Loaded {len(self.symbols_map)} symbols from {self.file_path}")
                    return
            except Exception as e:
                logger.warning(f"Could not read universe file: {e}. Reinitializing defaults.")

        # Seed with initial core PSX equities
        self._seed_default_universe()

    def _seed_default_universe(self):
        initial_items = [
            {"symbol": "OGDC", "name": "Oil & Gas Development Co", "sector": "Oil & Gas Exploration", "listed_indices": ["KSE100", "KMI30"], "is_shariah_compliant": True, "lot_size": 1, "circuit_breaker_upper": 342.30, "circuit_breaker_lower": 294.50, "is_active": True},
            {"symbol": "PPL", "name": "Pakistan Petroleum Limited", "sector": "Oil & Gas Exploration", "listed_indices": ["KSE100", "KMI30"], "is_shariah_compliant": True, "lot_size": 1, "circuit_breaker_upper": 142.50, "circuit_breaker_lower": 123.00, "is_active": True},
            {"symbol": "HUBC", "name": "Hub Power Company Limited", "sector": "Power Generation", "listed_indices": ["KSE100", "KMI30"], "is_shariah_compliant": True, "lot_size": 1, "circuit_breaker_upper": 148.50, "circuit_breaker_lower": 128.00, "is_active": True},
            {"symbol": "ENGRO", "name": "Engro Corporation", "sector": "Fertilizer / Conglomerate", "listed_indices": ["KSE100", "KMI30"], "is_shariah_compliant": True, "lot_size": 1, "circuit_breaker_upper": 374.00, "circuit_breaker_lower": 322.00, "is_active": True},
            {"symbol": "LUCK", "name": "Lucky Cement Limited", "sector": "Cement", "listed_indices": ["KSE100", "KMI30"], "is_shariah_compliant": True, "lot_size": 1, "circuit_breaker_upper": 1015.00, "circuit_breaker_lower": 874.00, "is_active": True},
            {"symbol": "MCB", "name": "MCB Bank Limited", "sector": "Commercial Banks", "listed_indices": ["KSE100"], "is_shariah_compliant": False, "lot_size": 1, "circuit_breaker_upper": 260.00, "circuit_breaker_lower": 224.00, "is_active": True},
            {"symbol": "UBL", "name": "United Bank Limited", "sector": "Commercial Banks", "listed_indices": ["KSE100"], "is_shariah_compliant": False, "lot_size": 1, "circuit_breaker_upper": 310.00, "circuit_breaker_lower": 267.00, "is_active": True},
            {"symbol": "MEBL", "name": "Meezan Bank Limited", "sector": "Islamic Banking", "listed_indices": ["KSE100", "KMI30"], "is_shariah_compliant": True, "lot_size": 1, "circuit_breaker_upper": 252.00, "circuit_breaker_lower": 217.00, "is_active": True},
            {"symbol": "PSO", "name": "Pakistan State Oil", "sector": "Oil & Gas Marketing", "listed_indices": ["KSE100", "KMI30"], "is_shariah_compliant": True, "lot_size": 1, "circuit_breaker_upper": 206.00, "circuit_breaker_lower": 178.00, "is_active": True},
            {"symbol": "FFC", "name": "Fauji Fertilizer Company", "sector": "Fertilizer", "listed_indices": ["KSE100", "KMI30"], "is_shariah_compliant": True, "lot_size": 1, "circuit_breaker_upper": 226.00, "circuit_breaker_lower": 194.00, "is_active": True},
            {"symbol": "SYS", "name": "Systems Limited", "sector": "Technology & Comm.", "listed_indices": ["KSE100", "KMI30"], "is_shariah_compliant": True, "lot_size": 1, "circuit_breaker_upper": 518.00, "circuit_breaker_lower": 446.00, "is_active": True},
            {"symbol": "ATRL", "name": "Attock Refinery Limited", "sector": "Refinery", "listed_indices": ["KSE100", "KMI30"], "is_shariah_compliant": True, "lot_size": 1, "circuit_breaker_upper": 443.00, "circuit_breaker_lower": 381.00, "is_active": True},
            {"symbol": "DGKC", "name": "D.G. Khan Cement", "sector": "Cement", "listed_indices": ["KSE100", "KMI30"], "is_shariah_compliant": True, "lot_size": 1, "circuit_breaker_upper": 96.00, "circuit_breaker_lower": 82.00, "is_active": True},
            {"symbol": "PRL", "name": "Pakistan Refinery Limited", "sector": "Refinery", "listed_indices": ["KSE100", "KMI30"], "is_shariah_compliant": True, "lot_size": 1, "circuit_breaker_upper": 36.20, "circuit_breaker_lower": 31.00, "is_active": True},
            {"symbol": "SEARL", "name": "The Searle Company", "sector": "Pharmaceuticals", "listed_indices": ["KSE100", "KMI30"], "is_shariah_compliant": True, "lot_size": 1, "circuit_breaker_upper": 79.70, "circuit_breaker_lower": 68.60, "is_active": True},
            {"symbol": "AIRLINK", "name": "Air Link Communication", "sector": "Technology", "listed_indices": ["KSE100", "KMI30"], "is_shariah_compliant": True, "lot_size": 1, "circuit_breaker_upper": 152.00, "circuit_breaker_lower": 131.00, "is_active": True},
            {"symbol": "PAEL", "name": "Pak Elektron Limited", "sector": "Engineering", "listed_indices": ["KSE100"], "is_shariah_compliant": True, "lot_size": 1, "circuit_breaker_upper": 32.00, "circuit_breaker_lower": 27.50, "is_active": True},
            {"symbol": "CNERGY", "name": "Cnergyico PK Limited", "sector": "Refinery", "listed_indices": ["KSE100"], "is_shariah_compliant": True, "lot_size": 1, "circuit_breaker_upper": 6.45, "circuit_breaker_lower": 4.85, "is_active": True},
            {"symbol": "TELE", "name": "Telecard Limited", "sector": "Technology", "listed_indices": ["KSE100"], "is_shariah_compliant": True, "lot_size": 1, "circuit_breaker_upper": 10.20, "circuit_breaker_lower": 8.20, "is_active": True},
            {"symbol": "WTL", "name": "WorldCall Telecom", "sector": "Technology & Comm.", "listed_indices": ["ALLSHR"], "is_shariah_compliant": True, "lot_size": 1, "circuit_breaker_upper": 2.45, "circuit_breaker_lower": 1.00, "is_active": True}
        ]
        self.symbols_map = {item["symbol"]: SymbolUniverseItem(**item) for item in initial_items}
        self.save()

    def update_from_portal_universe(self, items: List[SymbolUniverseItem]):
        for itm in items:
            self.symbols_map[itm.symbol] = itm
        self.save()

    def get_all(self) -> List[SymbolUniverseItem]:
        return list(self.symbols_map.values())

    def get_by_symbol(self, symbol: str) -> Optional[SymbolUniverseItem]:
        return self.symbols_map.get(symbol.strip().upper())

    def save(self):
        try:
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump([item.model_dump() for item in self.symbols_map.values()], f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save universe to {self.file_path}: {e}")

symbol_universe_mgr = SymbolUniverseManager()
