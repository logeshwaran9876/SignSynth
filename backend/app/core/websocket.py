"""
WebSocket connection management for real-time job updates.
"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Set, Optional
import json
import structlog
from datetime import datetime, timezone

logger = structlog.get_logger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""
    
    def __init__(self):
        # Store active connections by job_id
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Store all connections for broadcasting
        self.all_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket, job_id: Optional[str] = None):
        """Accept a WebSocket connection."""
        await websocket.accept()
        self.all_connections.add(websocket)
        
        if job_id:
            if job_id not in self.active_connections:
                self.active_connections[job_id] = set()
            self.active_connections[job_id].add(websocket)
        
        logger.info("WebSocket connected", job_id=job_id)
    
    def disconnect(self, websocket: WebSocket, job_id: Optional[str] = None):
        """Remove a WebSocket connection."""
        self.all_connections.discard(websocket)
        
        if job_id and job_id in self.active_connections:
            self.active_connections[job_id].discard(websocket)
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]
        
        logger.info("WebSocket disconnected", job_id=job_id)
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific WebSocket connection."""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error("Failed to send personal message", error=str(e))
    
    async def send_to_job(self, job_id: str, message: dict):
        """Send a message to all connections subscribed to a specific job."""
        if job_id in self.active_connections:
            connections_to_remove = set()
            for websocket in self.active_connections[job_id]:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error("Failed to send job message", job_id=job_id, error=str(e))
                    connections_to_remove.add(websocket)
            
            # Remove failed connections
            for websocket in connections_to_remove:
                self.disconnect(websocket, job_id)
    
    async def broadcast(self, message: dict):
        """Broadcast a message to all connected clients."""
        connections_to_remove = set()
        for websocket in self.all_connections:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error("Failed to broadcast message", error=str(e))
                connections_to_remove.add(websocket)
        
        # Remove failed connections
        for websocket in connections_to_remove:
            self.disconnect(websocket)


# Global connection manager
manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket, job_id: Optional[str] = None):
    """WebSocket endpoint for real-time job updates.

    This endpoint does not require authentication by default. It will accept
    connections and manage subscriptions. If you later want to re-enable auth,
    add a dependency parameter and validate credentials before calling
    manager.connect.
    """
    # Accept the connection regardless of Authorization header to avoid 403
    # during handshake when frontend does not send auth for websockets.
    try:
        await manager.connect(websocket, job_id)
    except Exception:
        # If accept fails, ensure socket is closed gracefully
        try:
            await websocket.close(code=1000)
        except Exception:
            pass
        return
    
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message.get("type") == "ping":
                await manager.send_personal_message({"type": "pong"}, websocket)
            elif message.get("type") == "subscribe":
                new_job_id = message.get("job_id")
                if new_job_id:
                    await manager.connect(websocket, new_job_id)
                    await manager.send_personal_message({
                        "type": "subscribed",
                        "job_id": new_job_id
                    }, websocket)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, job_id)
    except Exception as e:
        logger.error("WebSocket error", error=str(e))
        manager.disconnect(websocket, job_id)


# WebSocket router
from fastapi import APIRouter

websocket_router = APIRouter()

@websocket_router.websocket("/{job_id}")
async def websocket_job_updates(websocket: WebSocket, job_id: str):
    """WebSocket endpoint for job-specific updates."""
    await websocket_endpoint(websocket, job_id)

@websocket_router.websocket("/")
async def websocket_general(websocket: WebSocket):
    """WebSocket endpoint for general updates."""
    await websocket_endpoint(websocket)


@websocket_router.websocket("")
async def websocket_general_no_slash(websocket: WebSocket):
    """Accept connections to the prefix path without a trailing slash (e.g. /ws)."""
    await websocket_endpoint(websocket)


# Utility functions for sending updates
async def send_job_update(job_id: str, status: str, progress: int = None, data: dict = None):
    """Send a job update to subscribed clients."""
    message = {
        "type": "job_update",
        "job_id": job_id,
        "status": status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    if progress is not None:
        message["progress"] = progress
    
    if data:
        message.update(data)
    
    await manager.send_to_job(job_id, message)


async def send_system_notification(message: str, level: str = "info"):
    """Send a system notification to all clients."""
    notification = {
        "type": "system_notification",
        "message": message,
        "level": level,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await manager.broadcast(notification)

