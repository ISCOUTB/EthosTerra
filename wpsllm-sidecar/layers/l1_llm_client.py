"""
L1 – LLM Client con medición de TTFT (Time-To-First-Token)
Conecta con llama.cpp server vía API compatible con OpenAI.
Mide:
  - ttft_ms : tiempo hasta el primer token (streaming)
  - total_ms: latencia total de la respuesta completa
"""
import time
import asyncio
import httpx
import logging
from config import LLM_URL, MODEL_NAME, LLM_TIMEOUT, MAX_RETRIES, RETRY_BACKOFF_S

log = logging.getLogger("wpsllm-sidecar")

async def call_llm(prompt: str) -> tuple[str, int]:
    print(f"DEBUG: call_llm called with prompt length {len(prompt)}", flush=True)
    """
    Llama al LLM de forma síncrona (sin streaming) para diagnóstico.
    Returns:
        (full_response_text, latency_ms)
    """
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Eres el motor deliberativo de un agente BDI. "
                    "Responde ÚNICAMENTE con un objeto JSON válido. "
                    "No incluyas preámbulos, explicaciones ni comentarios fuera del JSON."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "stream": False,
        "temperature": 0.1,
        "max_tokens": 512,  # Espacio suficiente para razonamiento + JSON final
    }

    t_start = time.perf_counter()
    for attempt in range(MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
                response = await client.post(
                    f"{LLM_URL}/chat/completions",
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                
                # Robust extraction: Soporta formatos de razonamiento (Gemma IT / DeepSeek style)
                message = data.get("choices", [{}])[0].get("message", {})
                content = message.get("content", "")
                reasoning = message.get("reasoning_content", "")
                
                # Consolidamos texto: priorizamos content, si está vacío usamos reasoning
                # Muchos modelos ponen el JSON final en content tras razonar en reasoning_content
                full_text = content.strip() if content.strip() else reasoning.strip()
                
                latency_ms = int((time.perf_counter() - t_start) * 1000)
                finish_reason = data.get("choices",[{}])[0].get("finish_reason")
                print(f"DEBUG: LLM Response received. Length: {len(full_text)} | Finish: {finish_reason}", flush=True)
                
                # Volcado persistente
                try:
                    with open("/output/last_raw_response.txt", "w", encoding="utf-8") as f:
                        f.write(f"RAW_DICT: {data}\n\nCONTENT_EXTRACTED: {full_text}")
                except Exception: pass
                
                return full_text, latency_ms
                
        except Exception as exc:
            log.error(f"❌ Intento {attempt} falló: {exc}")
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_BACKOFF_S)
                continue
            raise
    return "", 0
