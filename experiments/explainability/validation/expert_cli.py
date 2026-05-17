#!/usr/bin/env python3
"""Interfaz CLI para evaluación de narrativas por expertos en desarrollo rural.

Uso:
  python experiments/explainability/validation/expert_cli.py \\
    --report reports/explainability/json/explainability_all.json \\
    --evaluator "NombreExperto"

Genera: reports/explainability/expert/evaluator_<nombre>.json
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
REPORTS_DIR = PROJECT_ROOT / "reports" / "explainability" / "expert"

CRITERIA = [
    ("variable_id",       "¿Identifica correctamente las variables que dispararon la decisión?"),
    ("comprehensibility", "¿El lenguaje es comprensible para un técnico de extensión rural?"),
    ("faithfulness",      "¿La narrativa es fiel a la situación real de la familia?"),
]


def run(report_path: str, evaluator_name: str, start_at: int = 1) -> None:
    report = json.loads(Path(report_path).read_text(encoding="utf-8"))
    entries = report.get("entries", [])
    if not entries:
        print("No se encontraron narrativas en el informe.")
        sys.exit(1)

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = REPORTS_DIR / f"evaluator_{evaluator_name.replace(' ', '_')}.json"

    # Cargar evaluaciones previas si existen
    existing: list[dict] = []
    if out_path.exists():
        existing = json.loads(out_path.read_text(encoding="utf-8")).get("evaluations", [])
    evaluated_indices = {e["index"] for e in existing}

    print(f"\n{'='*70}")
    print(f"  EVALUACIÓN DE EXPLICABILIDAD — EthosTerra / 20CCC")
    print(f"  Evaluador: {evaluator_name}")
    print(f"  Narrativas totales: {len(entries)}")
    print(f"  Ya evaluadas: {len(evaluated_indices)}")
    print(f"  Escala: 1=muy deficiente  2=deficiente  3=aceptable  4=bueno  5=excelente")
    print(f"{'='*70}\n")

    evaluations = list(existing)

    for i, entry in enumerate(entries, 1):
        if i < start_at or i in evaluated_indices:
            continue

        print(f"\n{'─'*70}")
        print(f"Narrativa {i}/{len(entries)} | Tratamiento: {entry.get('treatment_id', '-')} | "
              f"Tipo: {entry.get('episode_type', '-')} | Agente: {entry.get('agent', '-')}")
        print(f"Meta: {entry.get('goal', '-')} | Fecha: {entry.get('date', '-')}")
        print(f"{'─'*70}")
        print("\n[NARRATIVA GENERADA]")
        print(entry.get("narrative", "(sin texto)"))
        print()

        scores: dict[str, int | str] = {"index": i}
        for key, question in CRITERIA:
            while True:
                raw = input(f"  {question}\n  Puntaje [1-5] (o 's' para saltar): ").strip()
                if raw.lower() == "s":
                    scores[key] = 0
                    break
                try:
                    val = int(raw)
                    if 1 <= val <= 5:
                        scores[key] = val
                        break
                    print("  Por favor ingrese un número entre 1 y 5.")
                except ValueError:
                    print("  Entrada inválida. Use un número del 1 al 5.")

        comment = input("  Comentario libre (Enter para omitir): ").strip()
        if comment:
            scores["comment"] = comment

        scores["timestamp"] = datetime.now().isoformat()
        scores["treatment_id"] = entry.get("treatment_id", "")
        scores["episode_type"] = entry.get("episode_type", "")
        evaluations.append(scores)

        out_path.write_text(
            json.dumps(
                {"evaluator": evaluator_name, "date": datetime.now().isoformat(), "evaluations": evaluations},
                indent=2,
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        print(f"  ✓ Guardado ({i}/{len(entries)})")

        resp = input("\n  [ENTER para continuar, 'q' para salir]: ").strip().lower()
        if resp == "q":
            break

    print(f"\n{'='*70}")
    print(f"Evaluación guardada en: {out_path}")
    print(f"Total evaluadas en esta sesión: {len(evaluations) - len(evaluated_indices)}")
    print(f"{'='*70}\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluación experta de narrativas de explicabilidad")
    parser.add_argument("--report", required=True, help="Ruta al JSON de narrativas")
    parser.add_argument("--evaluator", required=True, help="Nombre del evaluador")
    parser.add_argument("--start-at", type=int, default=1, help="Empezar desde la narrativa N")
    args = parser.parse_args()

    if not Path(args.report).exists():
        print(f"Informe no encontrado: {args.report}")
        sys.exit(1)

    run(args.report, args.evaluator, args.start_at)


if __name__ == "__main__":
    main()
