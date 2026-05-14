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

    def start(self) -> None:
        super().start()
        import threading
        self._map_timer = threading.Thread(target=self._map_broadcast_loop, daemon=True)
        self._map_timer.start()

    def _map_broadcast_loop(self) -> None:
        import time
        while True:
            time.sleep(5)
            self.broadcast_map_data()

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

    def broadcast_map_data(self) -> None:
        try:
            from ethosterra.world_loader import get_world_loader
            loader = get_world_loader()
            if loader.get_parcel_count() == 0:
                return

            from besa.kernel.adm import AdmBESA
            adm = AdmBESA.get_instance()
            if not adm:
                return

            parcel_states: dict[str, dict] = {}
            for agent in adm.get_agents():
                if "PeasantFamily" in type(agent).__name__:
                    b = agent.state
                    for land in getattr(b, "lands", []):
                        parcel_states[land.id] = {
                            "id": land.id,
                            "x": getattr(land, "x", 0),
                            "y": getattr(land, "y", 0),
                            "stage": getattr(land, "stage", "NONE"),
                            "crop_type": getattr(land, "crop_type", ""),
                            "owner": b.alias,
                            "secure": getattr(b, "secure", 0),
                            "money": getattr(b, "money", 0),
                        }

            world_data = {
                "type": "map",
                "parcels": loader.to_dict(),
                "states": parcel_states,
            }
            self.broadcast(f"m={json.dumps(world_data)}")
        except Exception:
            pass
