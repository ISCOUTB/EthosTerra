"""
WPSnext Sidecar – Configuración central
"""
import os
from pathlib import Path

# ── LLM ────────────────────────────────────────────────
LLM_URL: str = os.getenv("LLM_URL", "http://llama-cpp:8080/v1")
MODEL_NAME: str = os.getenv("MODEL_NAME", "gemma-4-e4b")
LLM_TIMEOUT: float = float(os.getenv("LLM_TIMEOUT", "25.0"))

# ── Modo híbrido ────────────────────────────────────────
# El LLM se activa solo cuando el estado del agente cumple algún umbral crítico
# (20-30% de los ciclos diarios, según el paper)
HYBRID_MONEY_THRESHOLD: float = float(os.getenv("HYBRID_MONEY_THRESHOLD", "500000"))
HYBRID_HEALTH_THRESHOLD: int = int(os.getenv("HYBRID_HEALTH_THRESHOLD", "30"))

# ── Métricas ────────────────────────────────────────────
METRICS_DIR: Path = Path(os.getenv("METRICS_DIR", "/output/metrics"))

# ── Retry ───────────────────────────────────────────────
MAX_RETRIES: int = int(os.getenv("MAX_RETRIES", "0"))
RETRY_BACKOFF_S: float = float(os.getenv("RETRY_BACKOFF_S", "0.5"))
