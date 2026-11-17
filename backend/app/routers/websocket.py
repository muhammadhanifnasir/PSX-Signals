import asyncio
import json
import random
import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.app.market_engine.engine import market_data_engine

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
    WebSocket endpoint for streaming real-time live PSX market data and ticks.
    """
    await manager.connect(websocket)
    try:
        # Send initial connected greeting
        await websocket.send_text(json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to PSX Signal Intelligence Live Data WebSocket stream",
            "is_mock": False,
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S PKT")
        }))

        # Send immediate initial state
        try:
            overview = await market_data_engine.get_market_overview()
            await websocket.send_text(json.dumps({
                "type": "MARKET_TICK",
                "index_name": overview.index_name,
                "current_value": overview.index_value,
                "change": overview.index_change,
                "change_percent": overview.index_change_percent,
                "volume_formatted": overview.total_volume_formatted,
                "timestamp": overview.timestamp,
                "is_mock": False
            }))
        except Exception:
            pass

        # Streaming loop
        while True:
            await asyncio.sleep(5)
            try:
                overview = await market_data_engine.get_market_overview()
                tick_payload = {
                    "type": "MARKET_TICK",
                    "index_name": overview.index_name,
                    "current_value": overview.index_value,
                    "change": overview.index_change,
                    "change_percent": overview.index_change_percent,
                    "volume_formatted": overview.total_volume_formatted,
                    "timestamp": overview.timestamp,
                    "is_mock": False
                }
                await websocket.send_text(json.dumps(tick_payload))
            except Exception:
                pass

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
