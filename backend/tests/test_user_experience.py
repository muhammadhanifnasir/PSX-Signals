import asyncio
import os
import sys

# Ensure repository root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.alerts import alerts_service
from backend.app.signals.storage import signal_storage

client = TestClient(app)

def test_stock_detail_and_technicals():
    print("Testing GET /api/stocks/AIRLINK...")
    res = client.get("/api/stocks/AIRLINK")
    assert res.status_code == 200, f"Stock detail failed: {res.status_code} - {res.text}"
    data = res.json()
    
    assert data["symbol"] == "AIRLINK"
    assert "candles" in data and len(data["candles"]) >= 30, "Missing candles in stock detail"
    assert "ema_9_series" in data and len(data["ema_9_series"]) > 0, "Missing EMA 9 series"
    assert "ema_21_series" in data and len(data["ema_21_series"]) > 0, "Missing EMA 21 series"
    assert "vwap_series" in data and len(data["vwap_series"]) > 0, "Missing VWAP series"
    assert "support_resistance" in data, "Missing Support/Resistance levels"
    
    sr = data["support_resistance"]
    assert sr["pivot"] > 0 and sr["r1"] >= sr["pivot"] and sr["s1"] <= sr["pivot"], "Floor pivots calculation invalid"
    
    assert "technicals" in data
    tech = data["technicals"]
    assert tech["rsi_14"] > 0, "RSI must be positive"
    assert tech["atr_14"] > 0, "ATR must be positive"
    
    assert "historical_markers" in data and len(data["historical_markers"]) > 0, "Missing historical signal markers"
    assert data["data_delay_type"] in ["DELAYED_15MIN", "REAL_TIME", "EOD"], "Invalid data delay type"
    print("  -> Stock detail, technical overlays, markers & floor pivots PASSED.")

def test_watchlist_management():
    print("Testing Watchlist CRUD operations...")
    # 1. GET Watchlist
    res_get = client.get("/api/watchlist")
    assert res_get.status_code == 200
    items = res_get.json()
    assert isinstance(items, list) and len(items) > 0, "Watchlist should contain seeded or user items"
    
    # 2. Add / Update a test stock
    test_symbol = "HUBC"
    res_add = client.post("/api/watchlist", json={
        "symbol": test_symbol,
        "target_buy_price": 135.50,
        "target_sell_price": 148.00,
        "alert_enabled": True,
        "notes": "Automated test addition - high dividend yield."
    })
    assert res_add.status_code == 200
    added = res_add.json()
    assert added["symbol"] == test_symbol
    assert added["target_buy_price"] == 135.50
    
    # 3. Toggle alert
    res_toggle = client.post(f"/api/watchlist/{test_symbol}/toggle-alert")
    assert res_toggle.status_code == 200
    assert "alert_enabled" in res_toggle.json()
    
    # 4. Remove stock
    res_del = client.delete(f"/api/watchlist/{test_symbol}")
    assert res_del.status_code == 200
    print("  -> Watchlist CRUD and alert toggle PASSED.")

def test_alerts_and_telegram_config():
    print("Testing Alerts & Telegram Configuration...")
    # 1. Notifications list
    res_notif = client.get("/api/alerts/notifications")
    assert res_notif.status_code == 200
    notifs = res_notif.json()
    assert isinstance(notifs, list)
    
    # 2. Get Config - ensure bot token is strictly masked
    res_cfg = client.get("/api/alerts/config")
    assert res_cfg.status_code == 200
    cfg = res_cfg.json()
    assert "telegram_bot_token" not in cfg, "CRITICAL: Plaintext telegram_bot_token MUST NEVER be exposed in GET /api/alerts/config"
    assert "telegram_bot_token_masked" in cfg
    
    # 3. Update Config
    res_update = client.post("/api/alerts/config", json={
        "telegram_enabled": True,
        "telegram_chat_id": "-1001987654321",
        "min_alert_score": 75,
        "alert_on_buy": True,
        "alert_on_target": True,
        "alert_on_stop_loss": True
    })
    assert res_update.status_code == 200
    updated_cfg = res_update.json()
    assert updated_cfg["telegram_chat_id"] == "-1001987654321"
    assert updated_cfg["min_alert_score"] == 75
    
    # 4. Test Notification Mark as Read
    if notifs:
        n_id = notifs[0]["id"]
        res_read = client.post(f"/api/alerts/notifications/{n_id}/read")
        assert res_read.status_code == 200
        
    res_read_all = client.post("/api/alerts/notifications/read-all")
    assert res_read_all.status_code == 200
    print("  -> Alerts & Telegram secret security PASSED.")

def test_signal_status_transitions():
    print("Testing Signal Status Transitions & Lifecycle...")
    # 1. Fetch active signals
    signals_res = client.get("/api/signals")
    assert signals_res.status_code == 200
    data = signals_res.json()
    signals = data.get("signals", [])
    
    if signals:
        target_sig = signals[0]
        sig_id = target_sig["id"]
        
        # 2. Update status to TARGET_1_HIT
        res_status = client.post(f"/api/signals/{sig_id}/status", json={
            "status": "TARGET_1_HIT",
            "note": "Target 1 attained at 1.8x risk multiple in simulation",
            "price": target_sig["target_1"]
        })
        assert res_status.status_code == 200
        assert res_status.json()["new_status"] == "TARGET_1_HIT"
        
        # 3. Check lifecycle history
        res_life = client.get(f"/api/signals/{sig_id}/lifecycle")
        assert res_life.status_code == 200
        events = res_life.json()
        assert any(e["new_status"] == "TARGET_1_HIT" for e in events), "Lifecycle event not recorded"
        
    print("  -> Signal status update and audit trail PASSED.")

if __name__ == "__main__":
    print("==================================================================")
    print("RUNNING PSX SIGNAL INTELLIGENCE USER EXPERIENCE & SIGNALS TESTS")
    print("==================================================================")
    test_stock_detail_and_technicals()
    test_watchlist_management()
    test_alerts_and_telegram_config()
    test_signal_status_transitions()
    print("==================================================================")
    print("ALL USER EXPERIENCE TESTS PASSED SUCCESSFULLY! (100% OK)")
    print("==================================================================")
