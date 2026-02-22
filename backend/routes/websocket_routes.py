from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json

router = APIRouter(tags=["WebSocket"])

# ── Connection manager ──
# Maps order_id → set of connected WebSocket clients watching it
class OrderConnectionManager:
    def __init__(self):
        self.connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, order_id: str, ws: WebSocket):
        await ws.accept()
        if order_id not in self.connections:
            self.connections[order_id] = set()
        self.connections[order_id].add(ws)
        print(f"✅ WS connected: order {order_id} — {len(self.connections[order_id])} watchers")

    def disconnect(self, order_id: str, ws: WebSocket):
        if order_id in self.connections:
            self.connections[order_id].discard(ws)
            if not self.connections[order_id]:
                del self.connections[order_id]
        print(f"🔌 WS disconnected: order {order_id}")

    async def broadcast_status(self, order_id: str, status: str):
        """Push status update to all clients watching this order."""
        if order_id not in self.connections:
            return
        dead = set()
        for ws in self.connections[order_id]:
            try:
                await ws.send_text(json.dumps({ "order_id": order_id, "status": status }))
            except Exception:
                dead.add(ws)
        # Clean up dead connections
        for ws in dead:
            self.connections[order_id].discard(ws)


manager = OrderConnectionManager()


@router.websocket("/ws/order/{order_id}")
async def order_status_ws(websocket: WebSocket, order_id: str):
    """
    Client connects here to watch a specific order in real time.
    When admin updates status via PATCH /api/v1/order/{id}/status,
    this socket immediately pushes the new status to the client.
    """
    await manager.connect(order_id, websocket)
    try:
        while True:
            # Keep connection alive — just wait for client ping or disconnect
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(order_id, websocket)
