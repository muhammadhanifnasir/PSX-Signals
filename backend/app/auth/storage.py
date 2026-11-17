import os
import sqlite3
import hashlib
import datetime
import uuid
from typing import Optional, Dict, Any, List

from backend.app.auth.models import UserProfile, UserSettings, UserSettingsUpdate

DB_PATH = "backend/data/psx_market_data.db"

class AuthStorage:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_tables()
        self._seed_default_user()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _hash_password(self, password: str, salt: str = "psx_salt_2026") -> str:
        return hashlib.sha256(f"{salt}_{password}".encode("utf-8")).hexdigest()

    def _init_tables(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'trader',
                display_name TEXT,
                created_at TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_settings (
                user_id TEXT PRIMARY KEY,
                theme TEXT NOT NULL DEFAULT 'dark',
                default_capital REAL NOT NULL DEFAULT 1000000.0,
                default_risk_pct REAL NOT NULL DEFAULT 1.5,
                default_timeframe TEXT NOT NULL DEFAULT '15m',
                sound_alerts_enabled INTEGER NOT NULL DEFAULT 1,
                telegram_notifications_enabled INTEGER NOT NULL DEFAULT 0,
                browser_notifications_enabled INTEGER NOT NULL DEFAULT 1,
                auto_refresh_interval_sec INTEGER NOT NULL DEFAULT 5,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
            );
            """)

            # Database Indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);")
            conn.commit()

    def _seed_default_user(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as cnt FROM user_profiles;")
            if cursor.fetchone()["cnt"] == 0:
                user_id = "USR-ADMIN-01"
                now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                pwd_hash = self._hash_password("admin123")

                cursor.execute("""
                INSERT INTO user_profiles (id, email, password_hash, role, display_name, created_at, is_active)
                VALUES (?, 'trader@psxsignals.com', ?, 'trader', 'PSX Lead Trader', ?, 1);
                """, (user_id, pwd_hash, now_str))

                cursor.execute("""
                INSERT INTO user_settings (user_id, theme, default_capital, default_risk_pct,
                                           default_timeframe, sound_alerts_enabled,
                                           telegram_notifications_enabled, browser_notifications_enabled,
                                           auto_refresh_interval_sec, updated_at)
                VALUES (?, 'dark', 1000000.0, 1.5, '15m', 1, 0, 1, 5, ?);
                """, (user_id, now_str))
                conn.commit()

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM user_profiles WHERE email = ? COLLATE NOCASE;", (email.strip(),))
            row = cursor.fetchone()
            return dict(row) if row else None

    def get_user_by_id(self, user_id: str) -> Optional[UserProfile]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM user_profiles WHERE id = ?;", (user_id,))
            row = cursor.fetchone()
            if row:
                return UserProfile(
                    id=row["id"],
                    email=row["email"],
                    role=row["role"],
                    display_name=row["display_name"],
                    created_at=row["created_at"],
                    is_active=bool(row["is_active"]),
                )
        return None

    def verify_password(self, email: str, plain_password: str) -> Optional[UserProfile]:
        user_row = self.get_user_by_email(email)
        if not user_row or not user_row["is_active"]:
            return None
        expected_hash = self._hash_password(plain_password)
        if user_row["password_hash"] == expected_hash:
            return UserProfile(
                id=user_row["id"],
                email=user_row["email"],
                role=user_row["role"],
                display_name=user_row["display_name"],
                created_at=user_row["created_at"],
                is_active=bool(user_row["is_active"]),
            )
        return None

    def get_user_settings(self, user_id: str) -> UserSettings:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM user_settings WHERE user_id = ?;", (user_id,))
            row = cursor.fetchone()
            if row:
                return UserSettings(
                    user_id=row["user_id"],
                    theme=row["theme"],
                    default_capital=row["default_capital"],
                    default_risk_pct=row["default_risk_pct"],
                    default_timeframe=row["default_timeframe"],
                    sound_alerts_enabled=bool(row["sound_alerts_enabled"]),
                    telegram_notifications_enabled=bool(row["telegram_notifications_enabled"]),
                    browser_notifications_enabled=bool(row["browser_notifications_enabled"]),
                    auto_refresh_interval_sec=row["auto_refresh_interval_sec"],
                    updated_at=row["updated_at"],
                )
        # Default fallback
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return UserSettings(
            user_id=user_id,
            theme="dark",
            default_capital=1000000.0,
            default_risk_pct=1.5,
            default_timeframe="15m",
            sound_alerts_enabled=True,
            telegram_notifications_enabled=False,
            browser_notifications_enabled=True,
            auto_refresh_interval_sec=5,
            updated_at=now_str,
        )

    def update_user_settings(self, user_id: str, update: UserSettingsUpdate) -> UserSettings:
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        current = self.get_user_settings(user_id)

        theme = update.theme if update.theme is not None else current.theme
        cap = update.default_capital if update.default_capital is not None else current.default_capital
        risk = update.default_risk_pct if update.default_risk_pct is not None else current.default_risk_pct
        tf = update.default_timeframe if update.default_timeframe is not None else current.default_timeframe
        sound = int(update.sound_alerts_enabled) if update.sound_alerts_enabled is not None else int(current.sound_alerts_enabled)
        tg = int(update.telegram_notifications_enabled) if update.telegram_notifications_enabled is not None else int(current.telegram_notifications_enabled)
        browser = int(update.browser_notifications_enabled) if update.browser_notifications_enabled is not None else int(current.browser_notifications_enabled)
        interval = update.auto_refresh_interval_sec if update.auto_refresh_interval_sec is not None else current.auto_refresh_interval_sec

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO user_settings (
                user_id, theme, default_capital, default_risk_pct, default_timeframe,
                sound_alerts_enabled, telegram_notifications_enabled, browser_notifications_enabled,
                auto_refresh_interval_sec, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                theme = excluded.theme,
                default_capital = excluded.default_capital,
                default_risk_pct = excluded.default_risk_pct,
                default_timeframe = excluded.default_timeframe,
                sound_alerts_enabled = excluded.sound_alerts_enabled,
                telegram_notifications_enabled = excluded.telegram_notifications_enabled,
                browser_notifications_enabled = excluded.browser_notifications_enabled,
                auto_refresh_interval_sec = excluded.auto_refresh_interval_sec,
                updated_at = excluded.updated_at;
            """, (user_id, theme, cap, risk, tf, sound, tg, browser, interval, now_str))
            conn.commit()

        return self.get_user_settings(user_id)

auth_storage = AuthStorage()
