import json
import os
import threading
from datetime import datetime
from typing import Any


class Episode:
    def __init__(
        self,
        agent_alias: str = "",
        episode_type: str = "",
        body: dict[str, Any] | None = None,
        embedding: list[float] | None = None,
        timestamp: str | None = None,
    ):
        self.agent_alias = agent_alias
        self.episode_type = episode_type
        self.body = body or {}
        self.embedding = embedding or []
        self.timestamp = timestamp or datetime.now().isoformat()


class EpisodeFilter:
    def __init__(
        self,
        agent_alias: str | None = None,
        episode_type: str | None = None,
        since: str | None = None,
        limit: int = 100,
    ):
        self.agent_alias = agent_alias
        self.episode_type = episode_type
        self.since = since
        self.limit = limit


class EpisodeStore:
    def __init__(self):
        self._lock = threading.Lock()
        self._episodes: list[Episode] = []

    def store(self, episode: Episode) -> None:
        with self._lock:
            self._episodes.append(episode)

    def query(self, filter_: EpisodeFilter | None = None) -> list[Episode]:
        with self._lock:
            result = list(self._episodes)
        if filter_:
            if filter_.agent_alias:
                result = [e for e in result if e.agent_alias == filter_.agent_alias]
            if filter_.episode_type:
                result = [e for e in result if e.episode_type == filter_.episode_type]
            if filter_.since:
                result = [e for e in result if e.timestamp >= filter_.since]
            result = result[:filter_.limit]
        return result

    def count(self) -> int:
        with self._lock:
            return len(self._episodes)


_PG_AVAILABLE: bool | None = None


def check_postgres() -> bool:
    global _PG_AVAILABLE
    if _PG_AVAILABLE is not None:
        return _PG_AVAILABLE
    try:
        import psycopg2
        psycopg2.connect(
            host=os.getenv("POSTGRES_HOST", "localhost"),
            port=int(os.getenv("POSTGRES_PORT", "5432")),
            dbname=os.getenv("POSTGRES_DB", "ethosterra"),
            user=os.getenv("POSTGRES_USER", "ethosterra"),
            password=os.getenv("POSTGRES_PASSWORD", "ethosterra"),
            connect_timeout=2,
        )
        _PG_AVAILABLE = True
    except Exception:
        _PG_AVAILABLE = False
    return _PG_AVAILABLE


class PostgresEpisodeStore(EpisodeStore):
    def __init__(self):
        super().__init__()
        self._available = check_postgres()
        self._conn = None
        if self._available:
            self._connect()
            self._init_schema()

    def _connect(self) -> None:
        if not self._available:
            return
        try:
            import psycopg2
            self._conn = psycopg2.connect(
                host=os.getenv("POSTGRES_HOST", "localhost"),
                port=int(os.getenv("POSTGRES_PORT", "5432")),
                dbname=os.getenv("POSTGRES_DB", "ethosterra"),
                user=os.getenv("POSTGRES_USER", "ethosterra"),
                password=os.getenv("POSTGRES_PASSWORD", "ethosterra"),
            )
        except Exception:
            self._available = False

    def _init_schema(self) -> None:
        if not self._conn:
            return
        try:
            cur = self._conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS episodes (
                    id SERIAL PRIMARY KEY,
                    agent_alias TEXT NOT NULL,
                    episode_type TEXT NOT NULL,
                    body JSONB NOT NULL DEFAULT '{}',
                    embedding REAL[],
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_episodes_agent ON episodes(agent_alias);
                CREATE INDEX IF NOT EXISTS idx_episodes_type ON episodes(episode_type);
            """)
            self._conn.commit()
            cur.close()
        except Exception:
            self._available = False

    def store(self, episode: Episode) -> None:
        super().store(episode)
        if not self._conn or not self._available:
            return
        try:
            cur = self._conn.cursor()
            cur.execute(
                "INSERT INTO episodes (agent_alias, episode_type, body) VALUES (%s, %s, %s)",
                (episode.agent_alias, episode.episode_type, json.dumps(episode.body)),
            )
            self._conn.commit()
            cur.close()
        except Exception:
            self._connect()


def create_episode_store() -> EpisodeStore:
    if check_postgres():
        return PostgresEpisodeStore()
    return EpisodeStore()
