"""Data access tool: CSV/JSON reading + episode detection sin BESA."""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from experiments.explainability.events.episode_event import EpisodeData

CRISIS_THRESHOLD = 500_000
LEISURE_GOALS = {"leisure_activities", "do_leisure_activities", "spare_time"}
NEGATIVE_EMOTIONS = {"negative", "sad", "angry", "fear", "disgust"}
HARVEST_DELTA = 100.0
E5_DIR = PROJECT_ROOT / "data" / "experiments" / "E5"


def load_treatment_csv(treatment_id: str) -> list[dict]:
    path = E5_DIR / treatment_id / "wpsSimulator.csv"
    if not path.exists():
        print(f"[data_tool] CSV no encontrado: {path}")
        return []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    return [
        {k: (v.strip() if v else v) for k, v in row.items()}
        for row in rows
        if row.get("date", "").strip()
    ]


def get_window(rows: list[dict], trigger_idx: int, half: int = 10) -> list[dict]:
    start = max(0, trigger_idx - half)
    end = min(len(rows), trigger_idx + half + 1)
    return rows[start:end]


def detect_episodes_in_csv(
    rows: list[dict],
    treatment_id: str,
    max_episodes: int = 5,
) -> list[EpisodeData]:
    episodes: list[EpisodeData] = []
    seen: set[tuple[str, str, str]] = set()
    prev_loans: dict[str, int] = {}
    prev_emotions: dict[str, str] = {}
    prev_harvest: dict[str, float] = {}

    for idx, row in enumerate(rows):
        agent = row.get("agent", "")
        date = row.get("date", "")
        money = _float(row.get("money", "0"))
        loans = _int(row.get("loans_active", "0"))
        emotion = (row.get("emotion") or "neutral").strip().lower()
        goal = (row.get("current_goal") or "").strip().lower()
        harv = _float(row.get("harvested_weight", "0"))

        ep_type: str | None = None
        if money < CRISIS_THRESHOLD and money > 0 and goal in LEISURE_GOALS:
            ep_type = "LEISURE"
        elif money < CRISIS_THRESHOLD and money > 0:
            ep_type = "CRISIS"
        elif "alternative_work" in goal:
            ep_type = "ALTERNATIVE_WORK"
        elif loans > prev_loans.get(agent, 0):
            ep_type = "LOAN_REQUEST"
        elif emotion in NEGATIVE_EMOTIONS and prev_emotions.get(agent, "neutral") not in NEGATIVE_EMOTIONS:
            ep_type = "EMOTIONAL_SHIFT"
        elif harv - prev_harvest.get(agent, 0.0) > HARVEST_DELTA:
            ep_type = "HARVEST"

        prev_loans[agent] = loans
        prev_emotions[agent] = emotion
        prev_harvest[agent] = harv

        if ep_type and (agent, date, ep_type) not in seen:
            seen.add((agent, date, ep_type))
            ep = EpisodeData(
                treatment_id=treatment_id,
                episode_type=ep_type,
                agent_alias=agent,
                trigger_date=date,
                trigger_row=dict(row),
                window=get_window(rows, idx, half=5),
                goal_id=goal,
                episode_index=len(episodes),
                trigger_idx=idx,
            )
            episodes.append(ep)
            if max_episodes > 0 and len(episodes) >= max_episodes:
                break

    return episodes


def load_narratives_json(path: Path | str) -> list[dict]:
    p = Path(path)
    if not p.exists():
        return []
    with open(p, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("entries", [])


def get_csv_summary(treatment_id: str) -> dict:
    from experiments.compute_metrics import analyze_treatment
    return analyze_treatment(E5_DIR / treatment_id / "wpsSimulator.csv")


def extract_episode_facts(
    trigger_row: dict,
    window_rows: list[dict],
    center_in_window: int,
) -> dict:
    """Pre-extrae hechos clave del trigger_row y ventana para pasarlos al LLM como variables."""
    money = _float(trigger_row.get("money", "0"))
    health = _float(trigger_row.get("health", "0"))
    emotion = (trigger_row.get("emotion") or "neutral").strip().lower()
    goal = (trigger_row.get("current_goal") or "-").replace("_", " ")
    loans = int(_float(trigger_row.get("loans_active", "0")))

    # Tendencia: compara capital actual vs 3 filas antes dentro de la ventana
    before_idx = max(0, center_in_window - 3)
    money_before = _float(window_rows[before_idx].get("money", "0")) if before_idx < len(window_rows) else money
    delta = money - money_before
    if abs(delta) < 5_000:
        trend = "estable"
    elif delta > 0:
        trend = f"subiendo ${abs(delta):,.0f} en los últimos días"
    else:
        trend = f"bajando ${abs(delta):,.0f} en los últimos días"

    days_below = sum(
        1 for r in window_rows
        if _float(r.get("money", "0")) < CRISIS_THRESHOLD and _float(r.get("money", "0")) > 0
    )

    return {
        "capital_fmt": f"${money:,.0f}",
        "capital_raw": money,
        "capital_delta_raw": abs(delta),
        "salud_fmt": f"{health:.0%}",
        "emocion": emotion,
        "meta": goal,
        "prestamos_activos": loans,
        "tendencia": trend,
        "dias_bajo_umbral": days_below,
        "bajo_umbral": money < CRISIS_THRESHOLD,
    }


def render_facts_table_html(facts: dict) -> str:
    umbral = "⚠ Por debajo del umbral" if facts["bajo_umbral"] else "✓ Por encima del umbral"
    rows = [
        ("Capital actual", facts["capital_fmt"] + " COP"),
        ("Salud", facts["salud_fmt"]),
        ("Estado emocional", facts["emocion"]),
        ("Meta activa", facts["meta"]),
        ("Tendencia del capital", facts["tendencia"]),
        ("Días bajo umbral de subsistencia", str(facts["dias_bajo_umbral"])),
        ("Préstamos activos", str(facts["prestamos_activos"])),
        ("Relación con umbral ($500K)", umbral),
    ]
    lines = ["<table class='facts-table'>"]
    for label, val in rows:
        lines.append(f"<tr><th>{label}</th><td>{val}</td></tr>")
    lines.append("</table>")
    return "\n".join(lines)


def render_window_table_html(rows: list[dict], highlight_idx: int | None = None) -> str:
    headers = ["Fecha", "Capital (COP)", "Salud", "Emoción", "Meta activa"]
    lines = ["<table class='data-table'>",
             "<tr>" + "".join(f"<th>{h}</th>" for h in headers) + "</tr>"]
    for i, row in enumerate(rows):
        money = row.get("money", "")
        try:
            money_fmt = f"${float(money):,.0f}"
        except (ValueError, TypeError):
            money_fmt = money or "-"
        goal = (row.get("current_goal") or "-").replace("_", " ")
        cls = ' class="highlight"' if i == highlight_idx else ""
        lines.append(
            f"<tr{cls}>"
            f"<td>{row.get('date', '-')}</td>"
            f"<td>{money_fmt}</td>"
            f"<td>{row.get('health', '-')}</td>"
            f"<td>{row.get('emotion', '-')}</td>"
            f"<td>{goal}</td>"
            "</tr>"
        )
    lines.append("</table>")
    return "\n".join(lines)


def render_window_table_md(rows: list[dict]) -> str:
    headers = ["Fecha", "Dinero (COP)", "Salud", "Emoción", "Meta activa"]
    out = ["| " + " | ".join(headers) + " |",
           "|" + "|".join(["---"] * len(headers)) + "|"]
    for row in rows[:10]:
        money = row.get("money", "")
        try:
            money_fmt = f"${float(money):,.0f}"
        except (ValueError, TypeError):
            money_fmt = money or "-"
        goal = (row.get("current_goal") or "-").replace("_", " ")
        out.append(
            f"| {row.get('date', '-')} "
            f"| {money_fmt} "
            f"| {row.get('health', '-')} "
            f"| {row.get('emotion', '-')} "
            f"| {goal} |"
        )
    return "\n".join(out)


def aggregate_monthly(rows: list[dict]) -> list[dict]:
    """Agrupa filas CSV por año+mes y devuelve métricas promediadas."""
    from collections import defaultdict
    from datetime import datetime

    buckets: dict[tuple[int, int], list[dict]] = defaultdict(list)
    for row in rows:
        date_str = row.get("date", "").strip()
        try:
            dt = datetime.strptime(date_str, "%d/%m/%Y")
        except ValueError:
            continue
        buckets[(dt.year, dt.month)].append(row)

    result = []
    for (year, month) in sorted(buckets.keys()):
        mrows = buckets[(year, month)]
        n = len(mrows) or 1
        money_vals = [_float(r.get("money", 0)) for r in mrows]
        health_vals = [_float(r.get("health", 0)) for r in mrows]
        happiness_vals = [_float(r.get("happiness", 0)) for r in mrows]
        food_vals = [_float(r.get("food_security", 0)) for r in mrows]
        harvest_vals = [_float(r.get("harvested_weight", 0)) for r in mrows]
        loans_vals = [_int(r.get("loans_active", 0)) for r in mrows]
        crisis_weeks = sum(1 for r in mrows if _float(r.get("money", 0)) < CRISIS_THRESHOLD and _float(r.get("money", 0)) > 0)

        # Dominant emotion and goal by frequency
        emotions = [r.get("emotion", "").strip().lower() for r in mrows if r.get("emotion")]
        goals = [r.get("current_goal", "").strip().lower() for r in mrows if r.get("current_goal")]
        from collections import Counter
        dom_emotion = Counter(emotions).most_common(1)[0][0] if emotions else "-"
        dom_goal = Counter(goals).most_common(1)[0][0].replace("_", " ") if goals else "-"

        result.append({
            "year": year,
            "month": month,
            "money_avg": sum(money_vals) / n,
            "money_min": min(money_vals),
            "health_avg": sum(health_vals) / n,
            "happiness_avg": sum(happiness_vals) / n,
            "food_security_avg": sum(food_vals) / n,
            "harvest_total": sum(harvest_vals),
            "loans_avg": sum(loans_vals) / n,
            "crisis_weeks": crisis_weeks,
            "dom_emotion": dom_emotion,
            "dom_goal": dom_goal,
        })
    return result


def render_monthly_table_md(monthly: list[dict]) -> str:
    """Devuelve tabla Markdown con una fila por mes."""
    headers = ["Año", "Mes", "$ Prom", "$ Mín", "Salud", "Felicidad", "Seg.Alim", "Cosecha kg", "Sem.Crisis", "Préstamos"]
    out = [
        "| " + " | ".join(headers) + " |",
        "|" + "|".join(["---"] * len(headers)) + "|",
    ]
    for m in monthly:
        out.append(
            f"| {m['year']} "
            f"| {m['month']:02d} "
            f"| ${m['money_avg']:,.0f} "
            f"| ${m['money_min']:,.0f} "
            f"| {m['health_avg']:.2f} "
            f"| {m['happiness_avg']:+.2f} "
            f"| {m['food_security_avg']:.2f} "
            f"| {m['harvest_total']:,.0f} "
            f"| {m['crisis_weeks']} "
            f"| {m['loans_avg']:.1f} |"
        )
    return "\n".join(out)


def render_monthly_table_html(monthly: list[dict]) -> str:
    headers = ["Año", "Mes", "$ Prom", "$ Mín", "Salud", "Felicidad", "Seg.Alim", "Cosecha kg", "Sem.Crisis", "Préstamos"]
    rows = ["<table class='data-table'>",
            "<tr>" + "".join(f"<th>{h}</th>" for h in headers) + "</tr>"]
    for m in monthly:
        crisis_cls = ' style="color:#cc0000;font-weight:bold"' if m["crisis_weeks"] > 2 else ""
        rows.append(
            f"<tr>"
            f"<td>{m['year']}</td>"
            f"<td>{m['month']:02d}</td>"
            f"<td>${m['money_avg']:,.0f}</td>"
            f"<td>${m['money_min']:,.0f}</td>"
            f"<td>{m['health_avg']:.2f}</td>"
            f"<td>{m['happiness_avg']:+.2f}</td>"
            f"<td>{m['food_security_avg']:.2f}</td>"
            f"<td>{m['harvest_total']:,.0f}</td>"
            f"<td{crisis_cls}>{m['crisis_weeks']}</td>"
            f"<td>{m['loans_avg']:.1f}</td>"
            "</tr>"
        )
    rows.append("</table>")
    return "\n".join(rows)


def _float(v: str) -> float:
    try:
        return float(v)
    except (ValueError, TypeError):
        return 0.0


def _int(v: str) -> int:
    try:
        return int(float(v))
    except (ValueError, TypeError):
        return 0
