"""Taguchi L27 treatment matrix for EthosTerra Explainability Experiment (20CCC).

27 tratamientos con 6 factores (money, land, personality, tools, seeds, water),
tomados directamente del Experimento 5. Los CSV de salida ya existen en
data/experiments/E5/<treatment_id>/wpsSimulator.csv.
"""
from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

# 6 factores × 3 niveles = L27
# money:    750k  / 1.5M  / 3M
# land:     2     / 6     / 12
# personality: 0.7 / 0.3  / -0.5
# tools:    10    / 999999 / 0
# seeds:    10    / 999999 / 0
# water:    0     / 999999 / 0

TAGUCHI_L27: list[dict] = []

_TREATMENTS_RAW: dict[str, dict] = {
    "E401": {"money": 750000,  "land": 2,  "personality":  0.7, "tools": 10,     "seeds": 10,     "water": 0},
    "E402": {"money": 750000,  "land": 2,  "personality":  0.7, "tools": 10,     "seeds": 999999, "water": 999999},
    "E403": {"money": 750000,  "land": 2,  "personality":  0.7, "tools": 10,     "seeds": 0,      "water": 0},
    "E404": {"money": 750000,  "land": 6,  "personality":  0.3, "tools": 999999, "seeds": 10,     "water": 0},
    "E405": {"money": 750000,  "land": 6,  "personality":  0.3, "tools": 999999, "seeds": 999999, "water": 999999},
    "E406": {"money": 750000,  "land": 6,  "personality":  0.3, "tools": 999999, "seeds": 0,      "water": 0},
    "E407": {"money": 750000,  "land": 12, "personality": -0.5, "tools": 0,      "seeds": 10,     "water": 0},
    "E408": {"money": 750000,  "land": 12, "personality": -0.5, "tools": 0,      "seeds": 999999, "water": 999999},
    "E409": {"money": 750000,  "land": 12, "personality": -0.5, "tools": 0,      "seeds": 0,      "water": 0},
    "E410": {"money": 1500000, "land": 2,  "personality":  0.3, "tools": 0,      "seeds": 10,     "water": 999999},
    "E411": {"money": 1500000, "land": 2,  "personality":  0.3, "tools": 0,      "seeds": 999999, "water": 0},
    "E412": {"money": 1500000, "land": 2,  "personality":  0.3, "tools": 0,      "seeds": 0,      "water": 0},
    "E413": {"money": 1500000, "land": 6,  "personality": -0.5, "tools": 10,     "seeds": 10,     "water": 999999},
    "E414": {"money": 1500000, "land": 6,  "personality": -0.5, "tools": 10,     "seeds": 999999, "water": 0},
    "E415": {"money": 1500000, "land": 6,  "personality": -0.5, "tools": 10,     "seeds": 0,      "water": 0},
    "E416": {"money": 1500000, "land": 12, "personality":  0.7, "tools": 999999, "seeds": 10,     "water": 999999},
    "E417": {"money": 1500000, "land": 12, "personality":  0.7, "tools": 999999, "seeds": 999999, "water": 0},
    "E418": {"money": 1500000, "land": 12, "personality":  0.7, "tools": 999999, "seeds": 0,      "water": 0},
    "E419": {"money": 3000000, "land": 2,  "personality": -0.5, "tools": 999999, "seeds": 10,     "water": 0},
    "E420": {"money": 3000000, "land": 2,  "personality": -0.5, "tools": 999999, "seeds": 999999, "water": 0},
    "E421": {"money": 3000000, "land": 2,  "personality": -0.5, "tools": 999999, "seeds": 0,      "water": 999999},
    "E422": {"money": 3000000, "land": 6,  "personality":  0.7, "tools": 0,      "seeds": 10,     "water": 0},
    "E423": {"money": 3000000, "land": 6,  "personality":  0.7, "tools": 0,      "seeds": 999999, "water": 0},
    "E424": {"money": 3000000, "land": 6,  "personality":  0.7, "tools": 0,      "seeds": 0,      "water": 999999},
    "E425": {"money": 3000000, "land": 12, "personality":  0.3, "tools": 10,     "seeds": 10,     "water": 0},
    "E426": {"money": 3000000, "land": 12, "personality":  0.3, "tools": 10,     "seeds": 999999, "water": 0},
    "E427": {"money": 3000000, "land": 12, "personality":  0.3, "tools": 10,     "seeds": 0,      "water": 999999},
}

for _tid, _params in _TREATMENTS_RAW.items():
    _csv = PROJECT_ROOT / "data" / "experiments" / "E5" / _tid / "wpsSimulator.csv"
    TAGUCHI_L27.append({
        "id": _tid,
        "csv_path": str(_csv),
        "csv_exists": _csv.exists(),
        **_params,
    })

TREATMENT_BY_ID: dict[str, dict] = {t["id"]: t for t in TAGUCHI_L27}


def get_available_treatments() -> list[dict]:
    """Returns only treatments whose CSV output already exists."""
    return [t for t in TAGUCHI_L27 if t["csv_exists"]]


def label(t: dict) -> str:
    p_map = {-0.5: "Neg", 0.3: "Neu", 0.7: "Pos"}
    return (
        f"{t['id']}: ${t['money']:,} L={t['land']} "
        f"P={p_map.get(t['personality'], '?')} "
        f"T={t['tools']} S={t['seeds']} W={t['water']}"
    )
