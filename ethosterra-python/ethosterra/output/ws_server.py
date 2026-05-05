from __future__ import annotations

import asyncio
import json
import threading
from typing import Any

from besa.kernel.adm import AdmBESA


class ViewerWSServer(threading.Thread):
    def __init__(self, host: str = "0.0.0.0", port: int = 8000):
        super().__init__(name="ViewerWS", daemon=True)
        self.host = host
        self.port = port
        self._connections: set[Any] = set()
        self._loop: asyncio.AbstractEventLoop | None = None
        self._server: Any = None

    async def _handler(self, websocket: Any) -> None:
        self._connections.add(websocket)
        try:
            async for msg in websocket:
                if msg == "setup":
                    adm = AdmBESA.get_instance()
                    if adm:
                        agents = adm.get_agents()
                        await websocket.send(f"q={len(agents)}")
        finally:
            self._connections.discard(websocket)

    async def _run_server(self) -> None:
        try:
            import websockets
            self._server = await websockets.serve(
                self._handler, self.host, self.port
            )
            await self._server.wait_closed()
        except ImportError:
            pass

    def run(self) -> None:
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        self._loop.run_until_complete(self._run_server())

    def broadcast(self, message: str) -> None:
        if not self._connections or not self._loop:
            return
        for ws in self._connections.copy():
            asyncio.run_coroutine_threadsafe(
                ws.send(message), self._loop
            )

    def stop(self) -> None:
        if self._server:
            self._server.close()
        if self._loop:
            self._loop.stop()
