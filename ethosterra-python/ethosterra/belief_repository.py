import os
import threading
from typing import Any, Callable


class BeliefChangeListener:
    def on_change(self, key: str, old_value: Any, new_value: Any) -> None:
        pass


class BeliefScope:
    GLOBAL = "global"
    AGENT = "agent"
    SESSION = "session"


class BeliefRepository:
    def __init__(self, agent_alias: str = ""):
        self._agent_alias = agent_alias
        self._data: dict[str, Any] = {}
        self._listeners: dict[str, list[Callable]] = {}
        self._lock = threading.Lock()

    def get(self, key: str, default: Any = None) -> Any:
        with self._lock:
            return self._data.get(key, default)

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            old = self._data.get(key)
            self._data[key] = value
            if old != value and key in self._listeners:
                for cb in self._listeners[key]:
                    cb(key, old, value)

    def bulk_set(self, mapping: dict[str, str]) -> None:
        with self._lock:
            self._data.update(mapping)

    def subscribe(self, key: str, callback: Callable) -> None:
        with self._lock:
            self._listeners.setdefault(key, []).append(callback)

    def exists(self, key: str) -> bool:
        with self._lock:
            return key in self._data

    def delete(self, key: str) -> None:
        with self._lock:
            self._data.pop(key, None)

    def state_hash(self) -> str:
        return f"agent:{self._agent_alias}:state"

    def personality_hash(self) -> str:
        return f"agent:{self._agent_alias}:personality"

    def emotional_hash(self) -> str:
        return f"agent:{self._agent_alias}:emotional"


_REDIS_AVAILABLE: bool | None = None


def check_redis() -> bool:
    global _REDIS_AVAILABLE
    if _REDIS_AVAILABLE is not None:
        return _REDIS_AVAILABLE
    try:
        import redis as _r
        _r.Redis(host=os.getenv("REDIS_HOST", "localhost"), port=int(os.getenv("REDIS_PORT", "6379")), socket_connect_timeout=1).ping()
        _REDIS_AVAILABLE = True
    except Exception:
        _REDIS_AVAILABLE = False
    return _REDIS_AVAILABLE


class RedisBeliefRepository(BeliefRepository):
    def __init__(self, agent_alias: str):
        super().__init__(agent_alias)
        self._available = check_redis()
        if self._available:
            import redis as _r
            self._redis = _r.Redis(
                host=os.getenv("REDIS_HOST", "localhost"),
                port=int(os.getenv("REDIS_PORT", "6379")),
                decode_responses=True,
            )
        else:
            self._redis = None

    def set(self, key: str, value: Any) -> None:
        super().set(key, value)
        if self._redis:
            try:
                self._redis.hset(self.state_hash(), key, str(value))
            except Exception:
                pass

    def bulk_set(self, mapping: dict[str, str]) -> None:
        super().bulk_set(mapping)
        if self._redis:
            try:
                self._redis.hset(self.state_hash(), mapping=mapping)
            except Exception:
                pass

    def get(self, key: str, default: Any = None) -> Any:
        val = super().get(key)
        if val is not None:
            return val
        if self._redis:
            try:
                v = self._redis.hget(self.state_hash(), key)
                return v if v is not None else default
            except Exception:
                pass
        return default


def create_belief_repository(agent_alias: str) -> BeliefRepository:
    if check_redis():
        return RedisBeliefRepository(agent_alias)
    return BeliefRepository(agent_alias)
