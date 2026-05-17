"""OllamaLLMBroker — adapta LLMBroker para usar Ollama /api/generate.

Hereda CircuitBreaker, AgentRateLimiter y LLMCache del broker padre.
Solo sobreescribe _call_llm() para traducir el formato de llama.cpp al de Ollama.
"""
from __future__ import annotations

import json

import httpx

from besa.llm.llm_broker import LLMBroker, CircuitBreaker, AgentRateLimiter
from besa.llm.llm_cache import LLMCache
from besa.llm.llm_client import LLMRequest, LLMResponse


class OllamaLLMBroker(LLMBroker):
    def __init__(
        self,
        ollama_url: str = "http://localhost:11434",
        model: str = "gemma3:4b",
        temperature: float = 0.0,
        seed: int = 42,
        num_predict: int = 1024,
    ):
        super().__init__(server_url=ollama_url)
        self.ollama_url = ollama_url.rstrip("/")
        self.model = model
        self.temperature = temperature
        self.seed = seed
        self.num_predict = num_predict
        self.client = httpx.Client(timeout=120.0)
        # Para el experimento de explicabilidad no aplicamos rate limiting
        # (cada episodio es un request independiente, no hay riesgo de spam)
        self.rate_limiter.min_ticks_between_requests = 0

    def run(self) -> None:
        import queue as _queue
        self._running = True
        while self._running:
            try:
                request = self.request_queue.get(timeout=1.0)
            except _queue.Empty:
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

            llm_response = self._call_ollama(request)
            if llm_response is None:
                continue

            self.cache.put(cache_key, llm_response)
            self.rate_limiter.record_request(request.agent_alias, request.tick)
            self._dispatch_response(request, llm_response)

    def call_sync(self, prompt: str, max_retries: int = 2) -> str:
        """API pública síncrona para el pipeline de análisis (sin cola, sin callbacks)."""
        from besa.llm.llm_client import LLMRequest as _LLMRequest
        req = _LLMRequest(template=prompt, context={}, callback_agent="", callback_guard=None)
        for _ in range(max_retries + 1):
            resp = self._call_ollama(req)
            if resp and len(resp.text.strip()) > 50:
                return resp.text.strip()
        return ""

    def _call_ollama(self, request: LLMRequest) -> LLMResponse | None:
        prompt = request.template if request.template else str(request.context)
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": self.temperature,
                "seed": self.seed,
                "num_predict": self.num_predict,
            },
        }
        try:
            resp = self.client.post(
                f"{self.ollama_url}/api/generate",
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            text = data.get("response", "")
            self.circuit_breaker.record_success()
            return LLMResponse(text=text, narrative=text)
        except Exception as exc:
            self.circuit_breaker.record_failure()
            print(f"[OllamaLLMBroker] Error: {exc}")
            return None
