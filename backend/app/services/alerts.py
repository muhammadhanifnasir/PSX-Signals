import os
import json
import uuid
import sqlite3
import logging
import datetime
import httpx
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

logger = logging.getLogger("alerts_service")

DB_PATH = "backend/data/psx_market_data.db"

class DashboardNotification(BaseModel):
    id: str
    signal_id: Optional[str] = None
    symbol: str
    title: str
    message: str
    notification_type: str = Field(description="BUY_CANDIDATE, TARGET_HIT, STOP_LOSS, SYSTEM, WARNING")
    timestamp: str
    is_read: bool = False

class AlertConfig(BaseModel):
    telegram_enabled: bool = False
    telegram_bot_token_masked: str = ""
    telegram_chat_id: str = ""
    min_alert_score: int = 70
    alert_on_buy: bool = True
    alert_on_target: bool = True
    alert_on_stop_loss: bool = True

class AlertConfigUpdate(BaseModel):
    telegram_enabled: Optional[bool] = None
    telegram_bot_token: Optional[str] = None  # Write-only!
    telegram_chat_id: Optional[str] = None
    min_alert_score: Optional[int] = None
    alert_on_buy: Optional[bool] = None
    alert_on_target: Optional[bool] = None
    alert_on_stop_loss: Optional[bool] = None

class AlertsService:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        # Load from environment variables initially
        self._raw_bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
        self.chat_id = os.getenv("TELEGRAM_CHAT_ID", "")
        self.enabled = os.getenv("TELEGRAM_ENABLED", "false").lower() in ["true", "1", "yes"]
        self.min_score = int(os.getenv("MIN_ALERT_SCORE", "70"))
        self._init_tables()
        self._load_config()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_tables(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS dashboard_notifications (
                id TEXT PRIMARY KEY,
                signal_id TEXT,
                symbol TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                notification_type TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                is_read INTEGER NOT NULL DEFAULT 0
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS alert_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            """)
            conn.commit()

    def _load_config(self):
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT key, value FROM alert_settings;")
                rows = cursor.fetchall()
                for r in rows:
                    k, v = r["key"], r["value"]
                    if k == "telegram_enabled":
                        self.enabled = v.lower() == "true"
                    elif k == "telegram_bot_token" and v:
                        self._raw_bot_token = v
                    elif k == "telegram_chat_id":
                        self.chat_id = v
                    elif k == "min_alert_score":
                        self.min_score = int(v)
        except Exception as e:
            logger.warning(f"Could not load alert settings: {e}")

    def get_config(self) -> AlertConfig:
        masked = ""
        if self._raw_bot_token:
            if len(self._raw_bot_token) > 8:
                masked = f"{self._raw_bot_token[:4]}••••••••{self._raw_bot_token[-4:]}"
            else:
                masked = "••••••••••••"

        return AlertConfig(
            telegram_enabled=self.enabled,
            telegram_bot_token_masked=masked,
            telegram_chat_id=self.chat_id,
            min_alert_score=self.min_score,
            alert_on_buy=True,
            alert_on_target=True,
            alert_on_stop_loss=True
        )

    def update_config(self, update: AlertConfigUpdate) -> AlertConfig:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if update.telegram_enabled is not None:
                self.enabled = update.telegram_enabled
                cursor.execute("INSERT OR REPLACE INTO alert_settings (key, value) VALUES ('telegram_enabled', ?);", (str(self.enabled),))

            if update.telegram_bot_token is not None and update.telegram_bot_token.strip():
                # Securely store in backend only
                self._raw_bot_token = update.telegram_bot_token.strip()
                cursor.execute("INSERT OR REPLACE INTO alert_settings (key, value) VALUES ('telegram_bot_token', ?);", (self._raw_bot_token,))

            if update.telegram_chat_id is not None:
                self.chat_id = update.telegram_chat_id.strip()
                cursor.execute("INSERT OR REPLACE INTO alert_settings (key, value) VALUES ('telegram_chat_id', ?);", (self.chat_id,))

            if update.min_alert_score is not None:
                self.min_score = update.min_alert_score
                cursor.execute("INSERT OR REPLACE INTO alert_settings (key, value) VALUES ('min_alert_score', ?);", (str(self.min_score),))

            conn.commit()

        logger.info("Updated Telegram & notification alert configuration.")
        return self.get_config()

    def create_notification(
        self,
        symbol: str,
        title: str,
        message: str,
        notification_type: str = "BUY_CANDIDATE",
        signal_id: Optional[str] = None
    ) -> DashboardNotification:
        nid = f"NOTIF-{uuid.uuid4().hex[:8].upper()}"
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S PKT")

        notif = DashboardNotification(
            id=nid,
            signal_id=signal_id,
            symbol=symbol,
            title=title,
            message=message,
            notification_type=notification_type,
            timestamp=now_str,
            is_read=False
        )

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO dashboard_notifications (id, signal_id, symbol, title, message, notification_type, timestamp, is_read)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0);
            """, (nid, signal_id, symbol, title, message, notification_type, now_str))
            conn.commit()

        return notif

    def get_notifications(self, limit: int = 50) -> List[DashboardNotification]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT * FROM dashboard_notifications
            ORDER BY timestamp DESC LIMIT ?;
            """, (limit,))
            rows = cursor.fetchall()
            return [
                DashboardNotification(
                    id=r["id"],
                    signal_id=r["signal_id"],
                    symbol=r["symbol"],
                    title=r["title"],
                    message=r["message"],
                    notification_type=r["notification_type"],
                    timestamp=r["timestamp"],
                    is_read=bool(r["is_read"])
                )
                for r in rows
            ]

    def mark_as_read(self, notification_id: str):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE dashboard_notifications SET is_read = 1 WHERE id = ?;", (notification_id,))
            conn.commit()

    def mark_all_as_read(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE dashboard_notifications SET is_read = 1;")
            conn.commit()

    async def send_telegram_alert(self, text: str) -> Dict[str, Any]:
        """
        Sends encrypted/secure Telegram alert to configured chat.
        Bot token is NEVER passed or exposed to frontend.
        """
        if not self.enabled:
            return {"status": "skipped", "message": "Telegram alerts disabled in settings."}

        if not self._raw_bot_token or not self.chat_id:
            return {"status": "error", "message": "Telegram bot token or chat ID is missing."}

        telegram_url = f"https://api.telegram.org/bot{self._raw_bot_token}/sendMessage"
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(telegram_url, json=payload)
                if res.status_code == 200:
                    logger.info("Telegram alert delivered successfully.")
                    return {"status": "success", "message": "Alert delivered successfully."}
                else:
                    err_msg = f"Telegram API error {res.status_code}: {res.text}"
                    logger.error(err_msg)
                    return {"status": "error", "message": err_msg}
        except Exception as e:
            err_msg = f"Failed to send Telegram message: {str(e)}"
            logger.error(err_msg)
            return {"status": "error", "message": err_msg}

    async def send_test_alert(self) -> Dict[str, Any]:
        """Sends a verification test alert to Telegram."""
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S PKT")
        msg = (
            f"<b>PSX Signal Intelligence - Test Alert</b>\n\n"
            f"Telegram alert channel configured successfully.\n"
            f"Timestamp: <code>{now_str}</code>\n"
            f"Engine: <code>Momentum + Volume + VWAP + Breakout v1.0.0</code>\n"
            f"Status: <b>ONLINE</b>\n\n"
            f"<i>Ready to receive live PSX trade setups for SCSTrade execution.</i>"
        )
        return await self.send_telegram_alert(msg)

    async def broadcast_trade_signal(self, signal: Any):
        """Broadcasts trade signal to dashboard and optional Telegram channel."""
        # 1. Create in-app dashboard notification
        title = f"BUY CANDIDATE: {signal.symbol} (Score: {signal.opportunity_score}/100)"
        body = (
            f"Entry: Rs. {signal.entry_price:.2f} | SL: Rs. {signal.stop_loss:.2f} | "
            f"T1: Rs. {signal.target_1:.2f} | R:R 1:{signal.risk_reward_ratio:.2f}"
        )
        self.create_notification(
            symbol=signal.symbol,
            title=title,
            message=body,
            notification_type="BUY_CANDIDATE",
            signal_id=signal.id
        )

        # 2. Forward to Telegram if score meets threshold
        if self.enabled and signal.opportunity_score >= self.min_score:
            tg_msg = (
                f"<b>🚨 PSX BUY CANDIDATE: {signal.symbol}</b>\n"
                f"<b>Company:</b> {signal.company_name}\n"
                f"<b>Opportunity Score:</b> <code>{signal.opportunity_score}/100</code>\n"
                f"<b>Strategy:</b> {signal.strategy_name} ({signal.strategy_version})\n\n"
                f"<b>Price:</b> Rs. {signal.current_price:.2f}\n"
                f"<b>Recommended Entry:</b> Rs. {signal.entry_price:.2f}\n"
                f"<b>Entry Zone:</b> [{signal.entry_zone_low:.2f} - {signal.entry_zone_high:.2f}]\n"
                f"<b>Stop-Loss:</b> Rs. {signal.stop_loss:.2f} (-{signal.max_risk_pct:.1f}%)\n"
                f"<b>Target 1:</b> Rs. {signal.target_1:.2f} (+{signal.potential_gain_target_1_pct:.1f}%)\n"
                f"<b>Target 2:</b> Rs. {signal.target_2:.2f} (+{signal.potential_gain_target_2_pct:.1f}%)\n"
                f"<b>Risk / Reward:</b> <code>1 : {signal.risk_reward_ratio:.2f}</code>\n\n"
                f"<b>Technical Confluence:</b>\n"
                f"• VWAP: Rs. {signal.vwap:.2f} (Gap: +{signal.vwap_distance_pct:.2f}%)\n"
                f"• Relative Volume: {signal.relative_volume:.2f}x\n"
                f"• RSI(14): {signal.rsi_14:.1f}\n\n"
                f"<i>⚠️ Manual Execution through SCSTrade. Strictly manage risk.</i>"
            )
            await self.send_telegram_alert(tg_msg)

alerts_service = AlertsService()
