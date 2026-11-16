import asyncio
import json
import random
import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.app.services.mock_data import mock_service

router = APIRouter(tags=["WebSocket"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                dead_connections.append(connection)
        for dc in dead_connections:
            self.disconnect(dc)

manager = ConnectionManager()

@router.websocket("/ws/live-signals")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for streaming real-time simulated PSX market ticks and signal alerts.
    """
    await manager.connect(websocket)
    try:
        # Send initial connected greeting
        await websocket.send_text(json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to PSX Signal Intelligence WebSocket stream",
            "is_mock": True,
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }))

        # Send immediate initial state
        initial_status = mock_service.get_market_status()
        await websocket.send_text(json.dumps({
            "type": "MARKET_TICK",
            "data": initial_status.model_dump(),
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }))

        # Streaming loop
        while True:
            # Sleep 4 seconds between ticks
            await asyncio.sleep(4)
            # Simulate random index micro-tick
            delta = round(random.uniform(-15.5, 22.0), 2)
            mock_service.kse_index += delta
            mock_service.kse_change += delta
            mock_service.kse_change_pct = round((mock_service.kse_change / (mock_service.kse_index - mock_service.kse_change)) * 100, 2)
            
            status = mock_service.get_market_status()
            tick_payload = {
                "type": "MARKET_TICK",
                "index_name": "KSE-100",
                "current_value": status.current_value,
                "change": status.change,
                "change_percent": status.change_percent,
                "volume_formatted": status.volume_formatted,
                "timestamp": status.last_updated,
                "is_mock": True
            }
            await websocket.send_text(json.dumps(tick_payload))

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
