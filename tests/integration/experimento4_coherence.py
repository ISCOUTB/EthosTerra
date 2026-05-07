#!/usr/bin/env python3
"""Experimento 4 Coherence Test — 18 treatments, 5 agents, 5 years."""
import csv, json, os, sys, time
from pathlib import Path

E4_REF = {
    "E4T01": (15206.19, 87.43), "E4T02": (12080.10, 87.17), "E4T03": (22414.78, 81.83),
    "E4T04": (14422.84, 36.10), "E4T05": (18519.44, 75.22), "E4T06": (12109.53, 42.07),
    "E4T07": (15771.13, 89.41), "E4T08": (12167.51, 88.57), "E4T09": (24631.04, 89.02),
    "E4T10": (16166.01, 78.30), "E4T11": (24620.09, 90.30), "E4T12": (13370.89, 62.63),
    "E4T13": (15754.82, 89.52), "E4T14": (12146.20, 89.94), "E4T15": (24578.01, 90.04),
    "E4T16": (16639.30, 82.47), "E4T17": (24499.59, 90.29), "E4T18": (13722.54, 78.65),
}

ROOT = Path("/home/jairo/Projects/EthosTerra")


def run_treatment(tid, money, land, emotions):
    import subprocess
    log_dir = ROOT / "data/experiments/E4_coherence/python" / tid
    log_dir.mkdir(parents=True, exist_ok=True)
    csv_path = log_dir / "wpsSimulator.csv"

    args = [
        sys.executable, str(ROOT / "ethosterra-python/ethosterra/start.py"),
        "--agents", "5", "--years", "5",
        "--money", str(money), "--land", str(land),
        "--world", "world.400.json", "--world-lands", "400",
        "--tools", "20", "--seeds", "50", "--water", "10",
        "--variance", "0.4", "--personality", "0.0",
        "--emotions", str(emotions), "--training", "1", "--irrigation", "1",
        "--speed", "0.0",
    ]
    env = os.environ.copy()
    env["PYTHONPATH"] = f"{ROOT}/besa-python:{ROOT}/ethosterra-python"
    env["ETHOSTERRA_ROOT"] = str(ROOT)
    env["ETHOSTERRA_LOGS_PATH"] = str(csv_path)
    env["ETHOSTERRA_STEPTIME"] = "1"

    subprocess.run(args, cwd=ROOT, env=env, capture_output=True, timeout=900)
    return csv_path if csv_path.exists() else None


def metrics(csv_path):
    if not csv_path: 
        return {"cultivado": 0.0, "salud": 0.0}
    agent_final = {}
    with open(csv_path) as f:
        for row in csv.DictReader(f):
            a = row.get("agent", "")
            try:
                tw = float(row.get("total_harvested_weight", row.get("harvested_weight", 0)))
                hl = float(row.get("health", 0))
            except (ValueError, TypeError):
                continue
            agent_final[a] = {"harvested": tw, "health": hl}

    if not agent_final: 
        return {"cultivado": 0.0, "salud": 0.0}
    total = sum(d["harvested"] for d in agent_final.values())
    avg_h = sum(d["health"] for d in agent_final.values()) / len(agent_final)
    if avg_h <= 1.0: 
        avg_h *= 100.0
    return {"cultivado": total, "salud": avg_h}


def main():
    money_levels = [750000, 1500000, 3000000]
    land_levels = [2, 6, 12]
    emo_levels = [(1, "Yes"), (0, "No")]
    
    treatments = []
    tid = 1
    for m in money_levels:
        for ld in land_levels:
            for ev, _ in emo_levels:
                treatments.append((f"E4T{tid:02d}", m, ld, ev))
                tid += 1

    print(f"Experimento 4 — {len(treatments)} tratamientos (5 agentes, 5 años, world.400)")
    results = []

    for tid, money, land, emotions in treatments:
        ref_c, ref_s = E4_REF.get(tid, (0, 0))
        print(f"[{tid}] money={money} land={land} emo={'Yes' if emotions else 'No'} ... ", end="", flush=True)
        t0 = time.time()
        csv_path = run_treatment(tid, money, land, emotions)
        m = metrics(csv_path) if csv_path else {"cultivado": 0.0, "salud": 0.0}
        cd = abs(m["cultivado"] - ref_c) / max(ref_c, 1) * 100
        sd = abs(m["salud"] - ref_s) / max(ref_s, 1) * 100
        elapsed = time.time() - t0
        flag = "⚠" if cd > 30 or sd > 25 else "✓"
        print(f"{flag} Cult={m['cultivado']:.0f} (ref={ref_c:.0f}, Δ={cd:.0f}%) Salud={m['salud']:.1f} (ref={ref_s:.1f}, Δ={sd:.0f}%) [{elapsed:.0f}s]")
        results.append({"id": tid, "money": money, "land": land, "emotions": emotions,
                        "py_cult": round(m["cultivado"], 2), "py_salud": round(m["salud"], 2),
                        "ref_cult": ref_c, "ref_salud": ref_s,
                        "cult_diff": round(cd, 2), "salud_diff": round(sd, 2)})

    # Report
    cd = [r["cult_diff"] for r in results]
    sd = [r["salud_diff"] for r in results]
    avg_cd = sum(cd) / len(cd)
    avg_sd = sum(sd) / len(sd)

    py_c = [r["py_cult"] for r in results]
    ref_c = [r["ref_cult"] for r in results]
    py_s = [r["py_salud"] for r in results]
    ref_s = [r["ref_salud"] for r in results]

    n = len(results)
    rho_c = _spearman(ref_c, py_c) if n > 2 else 0
    rho_s = _spearman(ref_s, py_s) if n > 2 else 0
    rmse_c = (sum((rc - pc)**2 for rc, pc in zip(ref_c, py_c)) / n) ** 0.5
    rmse_s = (sum((rs - ps)**2 for rs, ps in zip(ref_s, py_s)) / n) ** 0.5

    print(f"\n{'='*60}")
    print(f"Promedio Δ Cultivado: {avg_cd:.1f}%")
    print(f"Promedio Δ Salud: {avg_sd:.1f}%")
    print(f"Spearman ρ Cultivado: {rho_c:.4f}")
    print(f"Spearman ρ Salud: {rho_s:.4f}")
    print(f"RMSE Cultivado: {rmse_c:.1f}")
    verdict = "COHERENT" if avg_cd < 40 and rho_c > 0.4 else "DISCREPANT"
    print(f"VEREDICTO: {verdict}")

    report = {
        "experiment": "E4_coherence", "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "verdict": verdict, "avg_cult_diff": round(avg_cd, 2), "avg_salud_diff": round(avg_sd, 2),
        "rho_cult": round(rho_c, 4), "rho_salud": round(rho_s, 4),
        "rmse_cult": round(rmse_c, 2), "rmse_salud": round(rmse_s, 2), "treatments": results,
    }
    rp = ROOT / "data/experiments/E4_coherence/coherence_report.json"
    with open(rp, "w") as f:
        json.dump(report, f, indent=2)
    print(f"Report: {rp}")


def _spearman(x, y):
    n = len(x)
    if n < 3: return 0.0
    xr = {v: i + 1 for i, v in enumerate(sorted(set(x)))}
    yr = {v: i + 1 for i, v in enumerate(sorted(set(y)))}
    rx = [xr[v] for v in x]; ry = [yr[v] for v in y]
    mx, my = sum(rx)/n, sum(ry)/n
    num = sum((rx[i]-mx)*(ry[i]-my) for i in range(n))
    den = (sum((rx[i]-mx)**2 for i in range(n))*sum((ry[i]-my)**2 for i in range(n)))**0.5
    return num/den if den > 0 else 0.0


if __name__ == "__main__":
    main()
