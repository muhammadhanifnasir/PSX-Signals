from typing import Optional, Dict, Any, List
from pydantic import BaseModel, EmailStr, Field

class UserProfile(BaseModel):
    id: str
    email: str
    role: str = "trader"  # trader, analyst, admin
    display_name: Optional[str] = None
    created_at: str
    is_active: bool = True

class UserSettings(BaseModel):
    user_id: str
    theme: str = "dark"
    default_capital: float = Field(default=1_000_000.0, gt=0)
    default_risk_pct: float = Field(default=1.5, gt=0, le=10.0)
    default_timeframe: str = "15m"
    sound_alerts_enabled: bool = True
    telegram_notifications_enabled: bool = False
    browser_notifications_enabled: bool = True
    auto_refresh_interval_sec: int = Field(default=5, ge=2, le=60)
    updated_at: Optional[str] = None

class UserSettingsUpdate(BaseModel):
    theme: Optional[str] = None
    default_capital: Optional[float] = None
    default_risk_pct: Optional[float] = None
    default_timeframe: Optional[str] = None
    sound_alerts_enabled: Optional[bool] = None
    telegram_notifications_enabled: Optional[bool] = None
    browser_notifications_enabled: Optional[bool] = None
    auto_refresh_interval_sec: Optional[int] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 86400  # 24 hours
    user: UserProfile
