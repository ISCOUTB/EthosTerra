# ==============================================================================
# WPSnext – Makefile de Gestión
# ==============================================================================
# Interfaz unificada para la orquestación del simulador y el motor LLM locales.
# Basado en el framework tecno-económico TEMSCON-LATAM 2026.
# ==============================================================================

.PHONY: help download build up down ps logs benchmark metrics clean

help: ## Muestra esta ayuda
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

download: ## Descarga el modelo Gemma 4 E4B Q4_K_M (~4GB)
	@echo "📥 Descargando modelo..."
	bash scripts/download_model.sh

build: ## Construye las imágenes Docker (incluyendo el simulador Java)
	@echo "🏗️ Construyendo imágenes..."
	docker compose build

up: ## Levanta toda la infraestructura (llama-cpp + sidecar + simulador)
	@echo "🚀 Levantando servicios..."
	docker compose up -d

down: ## Detiene todos los servicios
	@echo "🛑 Deteniendo servicios..."
	docker compose down

ps: ## Estado de los contenedores
	docker compose ps

logs: ## Ver logs del sidecar y el simulador
	docker compose logs -f wellprodsim wpsllm-sidecar

benchmark: ## Ejecuta el benchmark de latencia (TTFT y Total)
	@echo "🔬 Ejecutando benchmark sintético..."
	curl -s "http://localhost:8001/benchmark?n=10" | jq .

metrics: ## Genera el reporte agregado de métricas LLM vs. Numérico
	@echo "📊 Generando reporte de métricas..."
	curl -s "http://localhost:8001/metrics" | jq .

clean: ## Limpia archivos temporales y logs de métricas
	@echo "🧹 Limpiando..."
	rm -rf output/metrics/*.jsonl
	docker compose down -v
