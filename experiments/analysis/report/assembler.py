"""Ensamblador de reportes HTML (Jinja2 + base64) y LaTeX."""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from experiments.analysis.state import AnalysisState
from experiments.analysis.tools.chart_tool import png_to_base64
from experiments.analysis.tools.stats_tool import build_metrics_table_html

_TEMPLATES_DIR = Path(__file__).parent / "templates"


def assemble_html_report(state: AnalysisState, output_dir: Path) -> str:
    output_dir = Path(output_dir)
    html_dir = output_dir / "html"
    html_dir.mkdir(parents=True, exist_ok=True)

    env = Environment(loader=FileSystemLoader(str(_TEMPLATES_DIR)), autoescape=False)
    template = env.get_template("report.html.j2")

    # Embebe todas las gráficas como base64
    def b64(path: str) -> str:
        if not path:
            return ""
        return png_to_base64(path)

    metrics_table = build_metrics_table_html(state.all_results)

    # Prepara datos por tratamiento para el template
    treatments_data = []
    for tr in state.all_results:
        episodes_data = []
        for er in tr.episode_results:
            sd = er.section_dict
            episodes_data.append({
                **sd,
                "timeline_b64": b64(sd.get("timeline_chart", "")),
            })
        treatments_data.append({
            "treatment_id": tr.treatment_id,
            "params": tr.params,
            "productividad": tr.productividad,
            "bienestar": tr.bienestar,
            "crisis_rate": tr.crisis_rate,
            "distribution_b64": b64(tr.distribution_chart_path),
            "episodes": episodes_data,
        })

    hallucination_rows = _build_hallucination_table_html(state.hallucination_log)

    rendered = template.render(
        generated_at=datetime.now().strftime("%Y-%m-%d %H:%M"),
        executive_summary=state.executive_summary_text,
        metrics_table=metrics_table,
        treatments=treatments_data,
        taguchi_productividad_b64=b64(state.taguchi_chart_paths.get("productividad", "")),
        taguchi_bienestar_b64=b64(state.taguchi_chart_paths.get("bienestar", "")),
        scores_heatmap_b64=b64(state.taguchi_chart_paths.get("scores_heatmap", "")),
        hallucination_rows=hallucination_rows,
        n_hallucinations=len(state.hallucination_log),
        n_treatments=len(state.all_results),
        n_narratives=sum(len(tr.episode_results) for tr in state.all_results),
    )

    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    path = html_dir / f"analysis_{timestamp}.html"
    path.write_text(rendered, encoding="utf-8")
    print(f"[Assembler] HTML: {path}")
    return str(path)


def assemble_latex_report(state: AnalysisState, output_dir: Path) -> str:
    output_dir = Path(output_dir)
    latex_dir = output_dir / "latex"
    latex_dir.mkdir(parents=True, exist_ok=True)

    lines = [
        r"\section*{Análisis ReAct — Experimento E5}",
        r"\subsection*{Scores de Calidad por Tipo de Episodio}",
        r"\begin{table}[ht]",
        r"\centering",
        r"\begin{tabular}{lrrrr}",
        r"\hline",
        r"Tipo de Episodio & N & Variables & Comprens. & Fidelidad \\",
        r"\hline",
    ]
    for ep_type, stats in state.score_stats.items():
        n = stats.get("variable_id", {}).get("n", 0)
        v = stats.get("variable_id", {}).get("avg", 0)
        c = stats.get("comprehensibility", {}).get("avg", 0)
        f = stats.get("faithfulness", {}).get("avg", 0)
        lines.append(f"  {ep_type} & {n} & {v:.3f} & {c:.3f} & {f:.3f} \\\\")
    lines += [
        r"\hline",
        r"\end{tabular}",
        r"\caption{Métricas de calidad de narrativas por tipo de episodio}",
        r"\end{table}",
        "",
        r"\subsection*{Métricas por Tratamiento}",
        r"\begin{table}[ht]",
        r"\centering",
        r"\begin{tabular}{lrrrl}",
        r"\hline",
        r"Tratamiento & Productividad & Bienestar & Crisis & Episodios \\",
        r"\hline",
    ]
    for tr in state.all_results:
        lines.append(
            f"  {tr.treatment_id} & {tr.productividad:.3f} & "
            f"{tr.bienestar:.3f} & {tr.crisis_rate:.1%} & "
            f"{len(tr.episode_results)} \\\\"
        )
    lines += [
        r"\hline",
        r"\end{tabular}",
        r"\caption{Productividad, bienestar y tasa de crisis por tratamiento}",
        r"\end{table}",
    ]

    if state.hallucination_log:
        lines += [
            "",
            r"\subsection*{Reporte de Alucinaciones Detectadas}",
            r"\begin{table}[ht]",
            r"\centering",
            r"\begin{tabular}{llll}",
            r"\hline",
            r"Tratamiento & Agente & Tipo & Corregida \\",
            r"\hline",
        ]
        for h in state.hallucination_log:
            corrected = "Sí" if h.get("corrected") else "No"
            lines.append(
                f"  {h['treatment_id']} & "
                f"{h['agent'][:20]} & "
                f"{h['episode_type']} & "
                f"{corrected} \\\\"
            )
        lines += [
            r"\hline",
            r"\end{tabular}",
            r"\caption{Alucinaciones numéricas detectadas por el validador}",
            r"\end{table}",
        ]

    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    path = latex_dir / f"analysis_{timestamp}.tex"
    path.write_text("\n".join(lines), encoding="utf-8")
    print(f"[Assembler] LaTeX: {path}")
    return str(path)


def assemble_monthly_html_report(state: AnalysisState, output_dir: Path) -> str:
    """Genera reporte HTML simplificado para el modo de análisis mensual."""
    from experiments.analysis.tools.data_tool import render_monthly_table_html

    output_dir = Path(output_dir)
    html_dir = output_dir / "html"
    html_dir.mkdir(parents=True, exist_ok=True)

    sections = []
    for tr in state.all_results:
        params_chips = "".join(
            f"<span class='param-chip'>{k}: {v}</span>" for k, v in tr.params.items()
        )
        monthly_table = render_monthly_table_html(tr.monthly_data) if tr.monthly_data else "<p>Sin datos mensuales.</p>"
        narrative_html = tr.monthly_narrative.replace("\n\n", "</p><p>").strip()
        narrative_html = f"<p>{narrative_html}</p>" if narrative_html else "<p><em>Sin análisis.</em></p>"
        sections.append(f"""
<div class="section" id="{tr.treatment_id}">
  <h2>{tr.treatment_id}</h2>
  <div style="margin-bottom:8px">{params_chips}</div>
  <div style="display:flex;gap:16px;margin-bottom:12px">
    <div class="stat-box"><div class="stat-num">{tr.productividad:.3f}</div><div class="stat-label">Productividad</div></div>
    <div class="stat-box"><div class="stat-num">{tr.bienestar:.3f}</div><div class="stat-label">Bienestar</div></div>
    <div class="stat-box"><div class="stat-num">{tr.crisis_rate:.1%}</div><div class="stat-label">Tasa de crisis</div></div>
    <div class="stat-box"><div class="stat-num">{len(tr.monthly_data)}</div><div class="stat-label">Meses analizados</div></div>
  </div>
  <h3>Resumen mensual agregado</h3>
  {monthly_table}
  <h3>Análisis narrativo</h3>
  <div class="narrative-text">{narrative_html}</div>
</div>""")

    toc_items = "".join(
        f'<li><a href="#{tr.treatment_id}">{tr.treatment_id}</a></li>'
        for tr in state.all_results
    )
    generated_at = datetime.now().strftime("%Y-%m-%d %H:%M")
    n_treatments = len(state.all_results)
    total_months = sum(len(tr.monthly_data) for tr in state.all_results)

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EthosTerra — Análisis Mensual ({generated_at})</title>
<style>
  body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 0; background: #f5f5f5; color: #333; }}
  .container {{ max-width: 1200px; margin: 0 auto; padding: 20px; }}
  h1 {{ background: #1a5276; color: white; padding: 16px 24px; margin: 0 0 20px; border-radius: 6px; }}
  h2 {{ color: #1a5276; border-left: 4px solid #1a5276; padding-left: 10px; margin-top: 30px; }}
  h3 {{ color: #1a5276; margin-top: 20px; }}
  .section {{ background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
  .data-table {{ border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 0.85em; overflow-x: auto; display: block; }}
  .data-table th {{ background: #1a5276; color: white; padding: 8px 10px; text-align: left; }}
  .data-table td {{ padding: 6px 10px; border-bottom: 1px solid #ddd; }}
  .data-table tr:hover td {{ background: #eaf2fb; }}
  .narrative-text {{ background: #f8f9fa; padding: 16px; border-radius: 4px; line-height: 1.8; font-size: 0.95em; }}
  .narrative-text p {{ margin: 0 0 12px; }}
  .stat-box {{ display: inline-block; background: #eaf2fb; border-radius: 6px; padding: 10px 16px; text-align: center; }}
  .stat-num {{ font-size: 1.6em; font-weight: bold; color: #1a5276; }}
  .stat-label {{ font-size: 0.8em; color: #666; }}
  .param-chip {{ display: inline-block; background: #e3f2fd; padding: 2px 8px; border-radius: 10px; font-size: 0.8em; margin: 2px; }}
  .toc {{ background: white; border-radius: 8px; padding: 16px; margin-bottom: 20px; }}
  .toc a {{ text-decoration: none; color: #1a5276; }}
</style>
</head>
<body>
<div class="container">
<h1>EthosTerra — Análisis Mensual de Bienestar Rural</h1>
<p style="color:#666;margin-top:-10px;margin-bottom:20px;">
  Generado: {generated_at} | Modo: Mensual | Modelo: Gemma 3 4B
</p>
<div style="margin-bottom:20px">
  <div class="stat-box"><div class="stat-num">{n_treatments}</div><div class="stat-label">Tratamientos</div></div>
  <div class="stat-box"><div class="stat-num">{total_months}</div><div class="stat-label">Meses analizados</div></div>
</div>
<div class="toc">
  <strong>Contenido:</strong>
  <ol>{toc_items}</ol>
</div>
{"".join(sections)}
</div>
</body>
</html>"""

    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    path = html_dir / f"analysis_monthly_{timestamp}.html"
    path.write_text(html, encoding="utf-8")
    print(f"[Assembler] HTML mensual: {path}")
    return str(path)


def _build_hallucination_table_html(log: list[dict]) -> str:
    if not log:
        return "<p>No se detectaron alucinaciones numéricas.</p>"
    rows = []
    for h in log:
        mismatches = "; ".join(
            f"{m['field']}: extraído ${m['extracted']:,.0f} / real ${m['truth']:,.0f} ({m['diff_pct']}%)"
            for m in h.get("mismatches", [])
        )
        corrected = "✅ Sí" if h.get("corrected") else "❌ No"
        rows.append(
            f"<tr><td>{h['treatment_id']}</td><td>{h['agent']}</td>"
            f"<td>{h['episode_type']}</td><td>{mismatches}</td>"
            f"<td>{corrected}</td></tr>"
        )
    return (
        "<table class='data-table'>"
        "<tr><th>Tratamiento</th><th>Agente</th><th>Tipo</th>"
        "<th>Discrepancias</th><th>Corregida</th></tr>"
        + "".join(rows) + "</table>"
    )
