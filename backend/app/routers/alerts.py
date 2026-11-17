from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from backend.app.services.alerts import (
    alerts_service,
    DashboardNotification,
    AlertConfig,
    AlertConfigUpdate,
)

router = APIRouter(prefix="/alerts", tags=["Alerts & Notifications"])

@router.get("/notifications", response_model=List[DashboardNotification])
async def get_dashboard_notifications(limit: int = 50):
    """Retrieve active and recent in-app dashboard notifications."""
    return alerts_service.get_notifications(limit=limit)

@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark a specific dashboard notification as read."""
    alerts_service.mark_as_read(notification_id)
    return {"status": "success", "id": notification_id}

@router.post("/notifications/read-all")
async def mark_all_notifications_read():
    """Mark all dashboard notifications as read."""
    alerts_service.mark_all_as_read()
    return {"status": "success"}

@router.get("/config", response_model=AlertConfig)
async def get_alert_configuration():
    """
    Retrieve Telegram and alert settings.
    Security Notice: Telegram Bot Tokens are strictly masked and never returned in plaintext.
    """
    return alerts_service.get_config()

@router.post("/config", response_model=AlertConfig)
async def update_alert_configuration(update: AlertConfigUpdate):
    """
    Update Telegram bot token, chat ID, min score, and alert toggles securely.
    """
    return alerts_service.update_config(update)

@router.post("/test-telegram")
async def test_telegram_alert():
    """
    Send a test Telegram alert using configured backend bot token and chat ID.
    """
    res = await alerts_service.send_test_alert()
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res
