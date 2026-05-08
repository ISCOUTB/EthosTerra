from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Parcel:
    id: str = ""
    name: str = ""
    kind: str = "land"
    coordinates: list[list[float]] = field(default_factory=list)
    centroid: tuple[float, float] = (0.0, 0.0)
    neighbors: list[str] = field(default_factory=list)

    @property
    def x(self) -> float:
        return self.centroid[0]

    @property
    def y(self) -> float:
        return self.centroid[1]

    @property
    def is_cultivable(self) -> bool:
        return self.kind in ("land", "forest")


def _compute_centroid(coords: list[list[float]]) -> tuple[float, float]:
    if not coords:
        return (0.0, 0.0)
    lat_sum = sum(c[0] for c in coords)
    lon_sum = sum(c[1] for c in coords)
    return (lat_sum / len(coords), lon_sum / len(coords))


def _edge_key(v1: list[float], v2: list[float], precision: int = 5) -> tuple:
    a = (round(v1[0], precision), round(v1[1], precision))
    b = (round(v2[0], precision), round(v2[1], precision))
    return tuple(sorted([a, b]))


def _build_grid_adjacency(parcels: list[dict]) -> tuple[dict[str, list[str]], dict[str, tuple[float, float]]]:
    n = len(parcels)
    cols = int(n ** 0.5)
    rows = (n + cols - 1) // cols

    coords: dict[str, tuple[float, float]] = {}
    adj: dict[str, list[str]] = {}
    name_list = [p.get("name", p.get("id", str(i))) for i, p in enumerate(parcels)]
    for i, name in enumerate(name_list):
        r, c = divmod(i, cols)
        coords[name] = (float(r), float(c))
        nbs = []
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols:
                idx = nr * cols + nc
                if idx < len(name_list):
                    nbs.append(name_list[idx])
        adj[name] = sorted(nbs)

    return adj, coords


def _build_adjacency(parcels: list[dict]) -> tuple[dict[str, list[str]], dict[str, tuple[float, float]]]:
    has_coords = any(p.get("coordinates") for p in parcels)
    if not has_coords:
        return _build_grid_adjacency(parcels)

    edge_map: dict[tuple, list[str]] = {}
    for p in parcels:
        coords = p.get("coordinates", [])
        name = p.get("name", p.get("id", ""))
        for i in range(len(coords)):
            e = _edge_key(coords[i], coords[(i + 1) % len(coords)])
            edge_map.setdefault(e, []).append(name)

    neighbors: dict[str, set[str]] = {}
    for edge, names in edge_map.items():
        if len(names) >= 2:
            for n in names:
                neighbors.setdefault(n, set()).update(names)

    adj = {name: sorted(ns - {name}) for name, ns in neighbors.items()}

    centroids = {}
    for p in parcels:
        name = p.get("name", p.get("id", ""))
        coords = p.get("coordinates", [])
        centroids[name] = _compute_centroid(coords)

    return adj, centroids


class WorldLoader:
    def __init__(self):
        self.parcels: dict[str, Parcel] = {}
        self.graph: dict[str, list[str]] = {}
        self._loaded = False

    def load(self, world_file: str | None = None) -> bool:
        if self._loaded:
            return True

        candidates = []
        if world_file:
            candidates.append(world_file)
            if not os.path.isabs(world_file):
                root = os.environ.get("ETHOSTERRA_ROOT", ".")
                candidates.append(os.path.join(root, "data", "worlds", world_file))
                candidates.append(os.path.join(root, world_file))

        default_names = ["land_world.origin.json", "land_world.03h.json", "land_world.11h.json"]
        for name in default_names:
            root = os.environ.get("ETHOSTERRA_ROOT", ".")
            candidates.append(os.path.join(root, "data", "worlds", name))

        data = None
        for path in candidates:
            if os.path.exists(path):
                with open(path) as f:
                    data = json.load(f)
                break

        if data is None:
            return False

        if not isinstance(data, list):
            return False

        adj, centroids = _build_adjacency(data)

        for p in data:
            name = p.get("name", p.get("id", ""))
            kind = p.get("kind", "land")
            coords = p.get("coordinates", [])
            centroid = centroids.get(name, _compute_centroid(coords))
            parcel = Parcel(
                id=name,
                name=name,
                kind=kind,
                coordinates=coords,
                centroid=centroid,
                neighbors=adj.get(name, []),
            )
            self.parcels[name] = parcel

        self.graph = {name: p.neighbors for name, p in self.parcels.items()}
        self._loaded = True
        return True

    def get_parcel(self, land_id: str) -> Parcel | None:
        return self.parcels.get(land_id)

    def get_neighbors(self, land_id: str) -> list[str]:
        return self.graph.get(land_id, [])

    def get_graph(self) -> dict[str, list[str]]:
        return dict(self.graph)

    def get_cultivable_parcels(self) -> list[Parcel]:
        return [p for p in self.parcels.values() if p.is_cultivable]

    def get_parcel_count(self) -> int:
        return len(self.parcels)

    def find_contiguous_block(
        self,
        size: int,
        exclude: set[str] | None = None,
        kind_filter: set[str] | None = None,
    ) -> list[str] | None:
        if exclude is None:
            exclude = set()
        if kind_filter is None:
            kind_filter = {"land", "forest"}

        candidates = [
            pid for pid, p in self.parcels.items()
            if pid not in exclude and p.kind in kind_filter
        ]

        from collections import deque

        for start in candidates:
            visited: list[str] = []
            queue = deque([start])
            seen = {start}
            while queue and len(visited) < size:
                current = queue.popleft()
                if current in exclude:
                    continue
                visited.append(current)
                for nb in self.graph.get(current, []):
                    if nb not in seen and nb not in exclude and self.parcels.get(nb, Parcel(kind="")).kind in kind_filter:
                        seen.add(nb)
                        queue.append(nb)
            if len(visited) >= size:
                return visited[:size]

        return None

    def to_dict(self) -> dict[str, Any]:
        return {
            pid: {
                "id": p.id,
                "name": p.name,
                "kind": p.kind,
                "x": p.x,
                "y": p.y,
                "neighbors": p.neighbors,
                "is_cultivable": p.is_cultivable,
            }
            for pid, p in self.parcels.items()
        }


_world_loader: WorldLoader | None = None


def get_world_loader() -> WorldLoader:
    global _world_loader
    if _world_loader is None:
        _world_loader = WorldLoader()
    return _world_loader
