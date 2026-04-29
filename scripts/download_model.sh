#!/bin/bash
# ===========================================================================
# WPSnext – Descarga del modelo Gemma 4 E4B Instruct (bartowski/Q4_K_M)
# Versión: gemma-4-E4B-it-Q4_K_M.gguf  (~4 GB)
# Fuente: https://huggingface.co/bartowski/google_gemma-4-E4B-it-GGUF
# ===========================================================================
set -euo pipefail

MODEL_DIR="$(dirname "$0")/../models"
MODEL_FILE="gemma-4-E4B-it-Q4_K_M.gguf"
URL="https://huggingface.co/bartowski/google_gemma-4-E4B-it-GGUF/resolve/main/google_gemma-4-E4B-it-Q4_K_M.gguf?download=true"
TARGET="$MODEL_DIR/$MODEL_FILE"

mkdir -p "$MODEL_DIR"

if [ -f "$TARGET" ]; then
    echo "✅ Modelo ya descargado: $TARGET"
    echo "   Tamaño: $(du -sh "$TARGET" | cut -f1)"
    exit 0
fi

echo "⬇️  Descargando $MODEL_FILE..."
echo "   Destino: $TARGET"
echo "   Tamaño esperado: ~4 GB"
echo ""

if command -v wget &> /dev/null; then
    wget --progress=bar:force -c -O "$TARGET" "$URL"
elif command -v curl &> /dev/null; then
    curl -L --progress-bar -C - -o "$TARGET" "$URL"
else
    echo "❌ Error: se necesita wget o curl instalado"
    exit 1
fi

echo ""
echo "✅ Descarga completa: $(du -sh "$TARGET" | cut -f1)"
