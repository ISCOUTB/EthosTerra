"""Generación de gráficas con matplotlib (modo no-interactivo)."""
from __future__ import annotations

import base64
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker

CRISIS_THRESHOLD = 500_000

_TYPE_COLORS = {
    "LEISURE": "#FA8072",
    "CRISIS": "#CC0000",
    "ALTERNATIVE_WORK": "#4472C4",
    "LOAN_REQUEST": "#ED7D31",
    "EMOTIONAL_SHIFT": "#A9D18E",
    "HARVEST": "#FFD966",
}
_FACTOR_LABELS = {
    "money": "Capital\nInicial",
    "land": "Tierra\n(parcelas)",
    "personality": "Personalidad",
    "tools": "Herramientas",
    "seeds": "Semillas",
    "water": "Agua",
}
_LEVEL_LABELS: dict = {
    750000: "Bajo\n(750K)", 1500000: "Medio\n(1.5M)", 3000000: "Alto\n(3M)",
    2: "2", 6: "6", 12: "12",
    0.7: "+0.7", 0.3: "0.3", -0.5: "-0.5",
    10: "Base", 999999: "Inf.", 0: "Ninguno",
}


def timeline_chart(
    agent: str,
    window_rows: list[dict],
    treatment_id: str,
    output_dir: Path,
    center_in_window: int | None = None,
) -> str:
    charts_dir = Path(output_dir) / "charts"
    charts_dir.mkdir(parents=True, exist_ok=True)

    dates = [r.get("date", str(i)) for i, r in enumerate(window_rows)]
    money: list[float] = []
    for r in window_rows:
        try:
            money.append(float(r.get("money", "0")))
        except (ValueError, TypeError):
            money.append(0.0)

    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(range(len(dates)), money, "b-o", markersize=4, linewidth=1.5, label="Capital (COP)")
    ax.axhline(y=CRISIS_THRESHOLD, color="orange", linestyle="--", linewidth=1.2,
               label=f"Umbral crisis (${CRISIS_THRESHOLD:,})")

    center = center_in_window if center_in_window is not None else len(window_rows) // 2
    ax.axvline(x=center, color="red", linestyle=":", linewidth=1.5, label="Evento detectado")

    step = max(1, len(dates) // 10)
    ax.set_xticks(range(0, len(dates), step))
    ax.set_xticklabels([dates[i] for i in range(0, len(dates), step)],
                       rotation=45, fontsize=7, ha="right")
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"${x:,.0f}"))
    ax.set_title(f"{treatment_id} — {agent}", fontsize=10)
    ax.set_ylabel("Capital (COP)", fontsize=9)
    ax.legend(fontsize=8)
    ax.grid(axis="y", alpha=0.3)
    plt.tight_layout()

    safe_agent = agent.replace(" ", "_")
    safe_date = dates[center].replace("/", "-") if dates and center < len(dates) else "nd"
    fname = f"timeline_{treatment_id}_{safe_agent}_{safe_date}.png"
    path = charts_dir / fname
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return str(path)


def distribution_chart(
    treatment_id: str,
    episode_counts: dict[str, int],
    output_dir: Path,
) -> str:
    charts_dir = Path(output_dir) / "charts"
    charts_dir.mkdir(parents=True, exist_ok=True)

    if not episode_counts:
        return ""

    labels = list(episode_counts.keys())
    values = [episode_counts[k] for k in labels]
    colors = [_TYPE_COLORS.get(lbl, "#999999") for lbl in labels]

    fig, ax = plt.subplots(figsize=(7, max(3, len(labels) * 0.8)))
    bars = ax.barh(labels, values, color=colors, edgecolor="white", linewidth=0.5)
    ax.bar_label(bars, fmt="%d", padding=4, fontsize=9)
    ax.set_xlabel("Número de episodios", fontsize=9)
    ax.set_title(f"Distribución de episodios — {treatment_id}", fontsize=10)
    ax.grid(axis="x", alpha=0.3)
    plt.tight_layout()

    path = charts_dir / f"distribution_{treatment_id}.png"
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return str(path)


def taguchi_effects_plot(
    factor_effects: dict,
    metric: str,
    output_dir: Path,
) -> str:
    charts_dir = Path(output_dir) / "charts"
    charts_dir.mkdir(parents=True, exist_ok=True)

    factors = [f for f in ["money", "land", "personality", "tools", "seeds", "water"]
               if f in factor_effects and factor_effects[f]]
    if not factors:
        return ""

    all_vals = [
        lv[metric]
        for f in factors
        for lv in factor_effects[f].values()
        if metric in lv
    ]
    grand_mean = sum(all_vals) / len(all_vals) if all_vals else 0.5

    ncols = 3
    nrows = (len(factors) + ncols - 1) // ncols
    fig, axes = plt.subplots(nrows, ncols, figsize=(ncols * 4, nrows * 3.2))
    axes_flat = axes.flatten() if len(factors) > 1 else [axes]

    for i, factor in enumerate(factors):
        ax = axes_flat[i]
        levels_data = factor_effects[factor]
        sorted_levels = sorted(levels_data.keys(),
                               key=lambda x: float(x) if isinstance(x, (int, float)) else 0)
        x_vals = list(range(len(sorted_levels)))
        y_vals = [levels_data[lv].get(metric, 0) for lv in sorted_levels]
        x_labels = [_LEVEL_LABELS.get(lv, str(lv)) for lv in sorted_levels]

        ax.plot(x_vals, y_vals, "b-o", markersize=6)
        ax.axhline(y=grand_mean, color="gray", linestyle="--", linewidth=0.8, alpha=0.7)
        ax.set_xticks(x_vals)
        ax.set_xticklabels(x_labels, fontsize=8)
        ax.set_title(_FACTOR_LABELS.get(factor, factor), fontsize=9, fontweight="bold")
        ax.set_ylim(-0.05, 1.1)
        ax.grid(axis="y", alpha=0.25)
        ax.tick_params(axis="y", labelsize=7)

    for j in range(len(factors), len(axes_flat)):
        axes_flat[j].set_visible(False)

    metric_label = "Productividad" if metric == "productividad" else "Bienestar"
    fig.suptitle(f"Efectos Principales Taguchi — {metric_label}", fontsize=11, fontweight="bold")
    plt.tight_layout(rect=[0, 0, 1, 0.95])

    path = charts_dir / f"taguchi_{metric}.png"
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return str(path)


def scores_heatmap(score_stats: dict, output_dir: Path) -> str:
    charts_dir = Path(output_dir) / "charts"
    charts_dir.mkdir(parents=True, exist_ok=True)

    episode_types = list(score_stats.keys())
    metrics = ["variable_id", "comprehensibility", "faithfulness"]
    metric_labels = ["Identif.\nVariables", "Comprensib.", "Fidelidad"]

    if not episode_types:
        return ""

    data = [
        [score_stats[et].get(m, {}).get("avg", 0) for m in metrics]
        for et in episode_types
    ]

    fig, ax = plt.subplots(figsize=(6, max(3, len(episode_types) * 0.9)))
    im = ax.imshow(data, cmap="RdYlGn", vmin=0, vmax=1, aspect="auto")
    ax.set_xticks(range(len(metric_labels)))
    ax.set_xticklabels(metric_labels, fontsize=9)
    ax.set_yticks(range(len(episode_types)))
    ax.set_yticklabels(episode_types, fontsize=9)

    for r in range(len(episode_types)):
        for c in range(len(metrics)):
            val = data[r][c]
            ax.text(c, r, f"{val:.2f}", ha="center", va="center", fontsize=10,
                    color="black" if val > 0.4 else "white")

    plt.colorbar(im, ax=ax, fraction=0.05)
    ax.set_title("Scores de Calidad por Tipo de Episodio", fontsize=10)
    plt.tight_layout()

    path = charts_dir / "scores_heatmap.png"
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return str(path)


def png_to_base64(path: str | Path) -> str:
    p = Path(path)
    if not p.exists():
        return ""
    with open(p, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")
