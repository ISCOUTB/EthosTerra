from __future__ import annotations

import queue
import threading
import time
from typing import Any

import httpx

from besa.llm.llm_client import LLMRequest, LLMResponse
from besa.llm.llm_cache import LLMCache


class CircuitBreaker:
    def __init__(
        self,
        failure_threshold: int = 3,
        cooldown_seconds: float = 60.0,
    ):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        self.last_failure_time = 0.0
        self.state = "closed"

    def record_failure(self) -> None:
        self.failure_count += 1
        self.last_failure_time = time.monotonic()
        if self.failure_count >= self.failure_threshold:
            self.state = "open"

    def is_open(self) -> bool:
        if self.state == "closed":
            return False
        if self.state == "open":
            if time.monotonic() - self.last_failure_time > self.cooldown_seconds:
                self.state = "half-open"
                self.failure_count = 0
                return False
            return True
        return False

    def record_success(self) -> None:
        self.state = "closed"
        self.failure_count = 0


class AgentRateLimiter:
    def __init__(self, min_ticks_between_requests: int = 30):
        self.last_request_tick: dict[str, int] = {}
        self.min_ticks_between_requests = min_ticks_between_requests

    def is_allowed(self, agent_alias: str, current_tick: int) -> bool:
        last = self.last_request_tick.get(agent_alias, -999)
        return (current_tick - last) >= self.min_ticks_between_requests

    def record_request(self, agent_alias: str, current_tick: int) -> None:
        self.last_request_tick[agent_alias] = current_tick


class LLMBroker(threading.Thread):
    def __init__(self, server_url: str = "http://localhost:8080"):
        super().__init__(name="LLMBroker", daemon=True)
        self.request_queue: queue.Queue[LLMRequest] = queue.Queue()
        self.client = httpx.Client(timeout=30.0)
        self.cache = LLMCache(max_size=500)
        self.circuit_breaker = CircuitBreaker()
        self.rate_limiter = AgentRateLimiter()
        self._running = False

    def run(self) -> None:
        self._running = True
        while self._running:
            try:
                request = self.request_queue.get(timeout=1.0)
            except queue.Empty:
                continue

            if not self.rate_limiter.is_allowed(request.agent_alias, request.tick):
                continue

            if self.circuit_breaker.is_open():
                continue

            cache_key = request.cache_key()
            if (cached := self.cache.get(cache_key)) is not None:
                self._dispatch_response(request, cached)
                self.rate_limiter.record_request(request.agent_alias, request.tick)
                continue

            try:
                response = self.client.post(
                    "/completion",
                    json={
                        "prompt": str(request.context),
                        "temperature": 0.0,
                        "seed": 42,
                        "n_predict": 256,
                    },
                )
                response.raise_for_status()
                self.circuit_breaker.record_success()
            except Exception:
                self.circuit_breaker.record_failure()
                continue

            llm_response = LLMResponse(text=response.text)
            self.cache.put(cache_key, llm_response)
            self.rate_limiter.record_request(request.agent_alias, request.tick)
            self._dispatch_response(request, llm_response)

    def submit_request(self, request: LLMRequest) -> None:
        self.request_queue.put_nowait(request)

    def _dispatch_response(self, req: LLMRequest, resp: LLMResponse) -> None:
        from besa.kernel.adm import AdmBESA
        from besa.kernel.event import EventBESA

        adm = AdmBESA.get_instance()
        if adm is not None:
            adm.send(
                EventBESA(
                    guard_type=req.callback_guard,
                    data=resp,
                    target=req.callback_agent,
                )
            )

    def stop(self) -> None:
        self._running = False
