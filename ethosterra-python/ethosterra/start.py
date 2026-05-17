from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
import threading
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

from besa.local.local_adm import LocalAdmBESA
from besa.bdi.declarative.goal_registry import GoalRegistry
from besa.bdi.declarative.plan_registry import PlanRegistry

from ethosterra.simulation_params import SimulationParams
from ethosterra.simulation_clock import SimulationClock
from ethosterra.agents.simulation_control import SimulationControlAgent
from ethosterra.agents.viewer_lens import ViewerLensAgent, set_ws_server
from ethosterra.agents.bank_office import BankOfficeAgent
from ethosterra.agents.market_place import MarketPlaceAgent
from ethosterra.agents.civic_authority import CivicAuthorityAgent
from ethosterra.agents.community_dynamics import CommunityDynamicsAgent
from ethosterra.agents.perturbation_generator import PerturbationGeneratorAgent
from ethosterra.agents.agro_ecosystem import AgroEcosystemAgent
from ethosterra.output.ws_server import ViewerWSServer


params = SimulationParams()
start_time = time.time()
_runner: SimulationRunner | None = None
_run_lock = threading.Lock()
_last_sim_mode: str = ""
_last_sim_agents: int = 0


def parse_args(argv: list[str] | None = None) -> SimulationParams:
    parser = argparse.ArgumentParser(description="EthosTerra Social Simulator")
    parser.add_argument("--mode", default="single", help="Container alias")
    parser.add_argument("--role", default=None, help="Node role: primary or worker")
    parser.add_argument("--agents", type=int, default=5, help="Number of peasant agents")
    parser.add_argument("--money", type=int, default=1500000, help="Initial money")
    parser.add_argument("--land", type=int, default=6, help="Land area")
    parser.add_argument("--personality", type=float, default=0.3, help="Personality type")
    parser.add_argument("--tools", type=int, default=10, help="Initial tools")
    parser.add_argument("--seeds", type=int, default=10, help="Initial seeds")
    parser.add_argument("--water", type=int, default=10, help="Initial water")
    parser.add_argument("--irrigation", type=int, default=1, help="Irrigation enabled")
    parser.add_argument("--emotions", type=int, default=1, help="Emotions enabled")
    parser.add_argument("--training", type=int, default=1, help="Training enabled")
    parser.add_argument("--years", type=int, default=1, help="Number of years")
    parser.add_argument("--variance", type=float, default=-1.0, help="Peasant variance")
    parser.add_argument("--criminality", type=int, default=-1, help="Criminality rate")
    parser.add_argument("--world", default="mediumworld.json", help="World file")
    parser.add_argument("--perturbation", default="", help="Perturbation type")
    parser.add_argument("--trainingslots", type=int, default=-1, help="Training slots")
    parser.add_argument("--world-lands", type=int, default=800, help="Total world parcels in CivicAuthority pool")
    parser.add_argument("--world-file", default="", help="GeoJSON world file (e.g., land_world.origin.json)")
    parser.add_argument("--crime-rate", type=float, default=0.0, help="Crime probability per day (0.0-1.0)")
    parser.add_argument("--speed", type=float, default=0.001, help="Tick speed (seconds per day)")
    parser.add_argument("--wait", action="store_true", help="Start in wait mode (API-controlled)")

    args = parser.parse_args(argv)
    p = SimulationParams()
    p.mode = args.mode
    p.role = args.role
    p.money = max(100000, args.money)
    p.land = args.land
    p.personality = args.personality
    p.tools = max(0, args.tools)
    p.seeds = max(0, args.seeds)
    p.water = max(0, args.water)
    p.irrigation = args.irrigation
    p.emotions = args.emotions
    p.training = args.training
    p.years = max(1, args.years)
    p.variance = args.variance
    p.criminality = args.criminality
    p.world = args.world
    p.perturbation = args.perturbation
    p.training_slots = args.trainingslots
    p.speed = args.speed
    p.world_lands = args.world_lands
    p.world_file = args.world_file
    p.crime_rate = args.crime_rate
    p.agents = max(1, args.agents)
    p._wait = args.wait
    return p


def create_services(adm: LocalAdmBESA, sim_params: SimulationParams | None = None) -> None:
    world_lands = sim_params.world_lands if sim_params else 800
    world_file = sim_params.world_file if sim_params else ""
    crime_rate = sim_params.crime_rate if sim_params else 0.0

    if world_file:
        from ethosterra.world_loader import get_world_loader
        loader = get_world_loader()
        loader.load(world_file)
        print(f"World loaded: {loader.get_parcel_count()} parcels from {world_file}")

    agents = [
        CommunityDynamicsAgent("CommunityDynamics"),
        MarketPlaceAgent("MarketPlace"),
        CivicAuthorityAgent("CivicAuthority", num_lands=world_lands, training_slots=10, world_file=world_file),
        BankOfficeAgent("BankOffice"),
        PerturbationGeneratorAgent("PerturbationGenerator"),
        AgroEcosystemAgent("AgroEcosystem"),
    ]
    if crime_rate > 0:
        from ethosterra.agents.crime_generator import CrimeGeneratorAgent
        agents.append(CrimeGeneratorAgent("CrimeGenerator", base_rate=crime_rate, period_ms=500))

    for agent in agents:
        adm.register_agent(agent)
    for agent in agents:
        agent.start()


def create_peasants(adm: LocalAdmBESA, sim_params: SimulationParams) -> None:
    from ethosterra.agents.peasant_family import PeasantFamily

    from ethosterra.agents.simulation_control import _SIM_START_YEAR
    control = SimulationControlAgent(
        f"{sim_params.mode}_SimulationControl",
        total_agents=sim_params.agents,
        years=sim_params.years,
        start_year=_SIM_START_YEAR,
    )
    viewer = ViewerLensAgent(f"{sim_params.mode}_ViewerLens")
    adm.register_agent(control)
    adm.register_agent(viewer)
    control.start()
    viewer.start()

    steptime_ms = max(1, int(sim_params.speed * 1000))
    for i in range(sim_params.agents):
        peasant = PeasantFamily(
            f"{sim_params.mode}PeasantFamily{i + 1}",
            sim_params,
        )
        adm.register_agent(peasant)
        peasant.start()
        peasant.start_periodic(steptime_ms)


def print_header() -> None:
    print("""
    * ==========================================================================
    *   __      __ _ __   ___        EthosTerra (Python)                       *
    *   \\ \\ /\\ / /| '_ \\ / __|      @version 3.7.0                          *
    *    \\ V  V / | |_) |\\__ \\       Multi-agent BDI Social Simulator        *
    *     \\_/\\_/  | .__/ |___/                                               *
    *             | |                                                         *
    *             |_|                                                         *
    * ==========================================================================
    """)


class ControlHandler(BaseHTTPRequestHandler):
    global_runner: SimulationRunner | None = None
    global_adm: LocalAdmBESA | None = None
    experiment_state: dict | None = None
    experiment_thread: threading.Thread | None = None

    report_proc: subprocess.Popen | None = None

    def do_GET(self) -> None:
        if self.path == "/status":
            self._json({"running": self.global_runner is not None and self.global_runner.is_alive()})
        elif self.path == "/health":
            self._json({"status": "ok"})
        elif self.path == "/experiment/status":
            self._experiment_status()
        elif self.path == "/report/status":
            self._report_status()
        else:
            self._json({"error": "not found"}, 404)

    def do_POST(self) -> None:
        if self.path == "/start":
            content_len = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_len)
            try:
                data = json.loads(body)
            except json.JSONDecodeError:
                self._json({"error": "invalid json"}, 400)
                return
            ok = start_simulation(data)
            self._json({"started": ok})
        elif self.path == "/stop":
            ok = stop_simulation()
            self._json({"stopped": ok})
        elif self.path == "/experiment/start":
            content_len = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_len)
            try:
                data = json.loads(body)
            except json.JSONDecodeError:
                self._json({"error": "invalid json"}, 400)
                return
            ok = self._start_experiment(data)
            self._json({"started": ok})
        elif self.path == "/experiment/stop":
            ok = self._stop_experiment()
            self._json({"stopped": ok})
        elif self.path == "/report/generate":
            content_len = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_len)
            try:
                data = json.loads(body) if content_len else {}
            except json.JSONDecodeError:
                data = {}
            self._generate_report(data)
        else:
            self._json({"error": "not found"}, 404)

    def _report_status(self) -> None:
        root = Path(os.environ.get("ETHOSTERRA_ROOT", "."))
        html_dir = root / "reports" / "analysis" / "html"
        generating = bool(
            ControlHandler.report_proc and ControlHandler.report_proc.poll() is None
        )
        if not html_dir.exists():
            self._json({"exists": False, "generating": generating})
            return
        files = sorted(html_dir.glob("analysis_*.html"), key=lambda p: p.stat().st_mtime, reverse=True)
        if not files:
            self._json({"exists": False, "generating": generating})
            return
        latest = files[0]
        stat = latest.stat()
        self._json({
            "exists": True,
            "generating": generating,
            "filename": latest.name,
            "sizeKb": round(stat.st_size / 1024),
            "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(stat.st_mtime)),
        })

    def _generate_report(self, data: dict) -> None:
        if ControlHandler.report_proc and ControlHandler.report_proc.poll() is None:
            self._json({"started": False, "reason": "already running"})
            return
        root = Path(os.environ.get("ETHOSTERRA_ROOT", "."))
        venv_python = root / ".venv" / "bin" / "python"
        python_bin = str(venv_python) if venv_python.exists() else sys.executable
        max_episodes = int(data.get("max_episodes", 5))
        model = data.get("model", "gemma3:4b")
        mode = data.get("mode", "episodes")
        default_ollama = os.environ.get("OLLAMA_URL", "http://localhost:11434")
        ollama_url = data.get("ollama_url") or default_ollama
        treatment = data.get("treatment")
        cmd = [
            python_bin,
            str(root / "experiments" / "analysis" / "orchestrator.py"),
            "--mode", mode,
            "--max-episodes", str(max_episodes),
            "--model", model,
            "--ollama-url", ollama_url,
        ]
        if treatment:
            cmd += ["--treatment", treatment]
        else:
            cmd += ["--all"]
        env = os.environ.copy()
        besa_src = root / "besa-python"
        if besa_src.exists():
            env["PYTHONPATH"] = f"{besa_src}:{root / 'ethosterra-python'}:{root}"
        else:
            env["PYTHONPATH"] = str(root)  # Docker: besa/ y ethosterra/ están directamente en /app
        env["ETHOSTERRA_ROOT"] = str(root)
        log_path = root / "reports" / "analysis" / "orchestrator.log"
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_file = open(log_path, "w")
        ControlHandler.report_proc = subprocess.Popen(
            cmd, cwd=str(root), env=env,
            stdout=log_file, stderr=log_file,
        )
        self._json({"started": True, "pid": ControlHandler.report_proc.pid})

    def _start_experiment(self, data: dict) -> bool:
        if self.experiment_thread and self.experiment_thread.is_alive():
            return False
        # Stop any running BDI simulation before launching the experiment
        stop_simulation()

        treatments = data.get("treatments", [])
        agents = int(data.get("agents", 5))
        years = int(data.get("years", 5))

        if not treatments:
            money_levels = data.get("money_levels", [750000, 1500000, 3000000])
            land_levels = data.get("land_levels", [2, 6, 12])
            emo_levels = data.get("emotion_levels", [1, 0])
            world_file = data.get("world_file", "")
            crime_rate = float(data.get("crime_rate", 0))

            tid = 1
            for m in money_levels:
                for ld in land_levels:
                    for ev in emo_levels:
                        treatments.append({
                            "id": f"E4T{tid:02d}",
                            "money": m,
                            "land": ld,
                            "emotions": ev,
                        })
                        tid += 1

        self.experiment_state = {
            "treatments": treatments,
            "total": len(treatments),
            "completed": 0,
            "current": None,
            "results": [],
            "running": True,
            "agents": agents,
            "years": years,
            "started_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        }

        world_file = data.get("world_file", "")
        crime_rate = float(data.get("crime_rate", 0))

        self.experiment_thread = threading.Thread(
            target=_run_experiment,
            args=(self, treatments, agents, years, world_file, crime_rate),
            daemon=True,
        )
        self.experiment_thread.start()
        return True

    def _stop_experiment(self) -> bool:
        if self.experiment_state:
            self.experiment_state["running"] = False
        return True

    def _experiment_status(self) -> None:
        if self.experiment_state:
            self._json(self.experiment_state)
        else:
            self._json({"treatments": [], "total": 0, "completed": 0, "running": False})

    def _json(self, data: dict, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self) -> None:
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


def start_simulation(config: dict) -> bool:
    global _runner, params, _last_sim_mode, _last_sim_agents
    with _run_lock:
        if _runner and _runner.is_alive():
            return False
        # Don't start a BDI simulation while an experiment is running
        handler = ControlHandler
        if handler.experiment_thread and handler.experiment_thread.is_alive():
            return False
        p = SimulationParams()
        p.agents = int(config.get("agents", params.agents))
        p.years = int(config.get("years", params.years))
        p.money = int(config.get("money", params.money))
        p.land = int(config.get("land", params.land if params.land > 0 else 6))
        p.tools = int(config.get("tools", params.tools))
        p.seeds = int(config.get("seeds", params.seeds))
        p.water = int(config.get("water", params.water))
        p.speed = float(config.get("speed", params.speed))
        p.irrigation = int(config.get("irrigation", 1))
        p.emotions = int(config.get("emotions", 1))
        p.training = int(config.get("training", 1))
        p.mode = config.get("mode", "single")

        adm = ControlHandler.global_adm

        # Unregister agents from previous simulation to prevent stale death messages
        if adm and _last_sim_mode:
            for i in range(1, _last_sim_agents + 1):
                adm.unregister_agent(f"{_last_sim_mode}PeasantFamily{i}")
            adm.unregister_agent(f"{_last_sim_mode}_SimulationControl")
            adm.unregister_agent(f"{_last_sim_mode}_ViewerLens")

        clock = SimulationClock.get_instance()
        clock.set_current_date("01/01/2024")

        if adm:
            _last_sim_mode = p.mode
            _last_sim_agents = p.agents
            create_peasants(adm, p)
        ControlHandler.global_runner = None
        return True


def _run_experiment(
    handler: type,
    treatments: list[dict],
    agents: int,
    years: int,
    world_file: str,
    crime_rate: float,
) -> None:
    import subprocess, os as _os
    state = handler.experiment_state
    root = _os.environ.get("ETHOSTERRA_ROOT", "/app")

    runner_script = _os.path.join(root, "ethosterra-python", "ethosterra", "run_treatment.py")

    for t in treatments:
        if not state["running"]:
            break

        tid = t["id"]
        state["current"] = tid

        log_dir = f"{root}/data/experiments/E4_coherence/python/{tid}"
        _os.makedirs(log_dir, exist_ok=True)
        csv_path = f"{log_dir}/wpsSimulator.csv"

        env = _os.environ.copy()
        env["EXP_AGENTS"] = str(agents)
        env["EXP_YEARS"] = str(years)
        env["EXP_MONEY"] = str(t["money"])
        env["EXP_LAND"] = str(t["land"])
        env["EXP_EMOTIONS"] = str(t["emotions"])
        env["EXP_TID"] = tid
        env["EXP_CSV"] = csv_path
        env["ETHOSTERRA_STEPTIME"] = "1"
        env.setdefault("PYTHONPATH", f"{root}/besa-python:{root}/ethosterra-python")

        try:
            result = subprocess.run(
                ["python", runner_script],
                cwd=root, env=env,
                capture_output=True, text=True, timeout=300,
            )

            total_cult = 0.0
            avg_health = 0.0
            for line in result.stdout.splitlines():
                if line.startswith("TREATMENT_RESULT:"):
                    parts = line.split()
                    for part in parts[1:]:
                        if part.startswith("cultivado="):
                            total_cult = float(part.split("=")[1])
                        elif part.startswith("salud="):
                            avg_health = float(part.split("=")[1])

            if total_cult == 0.0 and _os.path.exists(csv_path):
                import csv
                agent_data = {}
                with open(csv_path) as f:
                    for row in csv.DictReader(f):
                        a = row.get("agent", "")
                        try:
                            tw = float(row.get("total_harvested_weight", row.get("harvested_weight", 0)))
                            hl = float(row.get("health", 0))
                        except (ValueError, TypeError):
                            continue
                        agent_data[a] = {"harvested": tw, "health": hl}
                if agent_data:
                    total_cult = sum(d["harvested"] for d in agent_data.values())
                    avg_health = sum(d["health"] for d in agent_data.values()) / len(agent_data)
                    if avg_health <= 1.0:
                        avg_health *= 100.0

            state["results"].append({
                "id": tid,
                "money": t["money"],
                "land": t["land"],
                "emotions": bool(t["emotions"]),
                "cultivado": round(total_cult, 2),
                "salud": round(avg_health, 2),
                "status": "done",
            })
        except subprocess.TimeoutExpired:
            state["results"].append({
                "id": tid, "money": t["money"], "land": t["land"],
                "emotions": bool(t["emotions"]),
                "cultivado": 0, "salud": 0, "status": "timeout",
            })
        except Exception as e:
            state["results"].append({
                "id": tid, "money": t["money"], "land": t["land"],
                "emotions": bool(t["emotions"]),
                "cultivado": 0, "salud": 0, "status": f"error: {e}",
            })

        state["completed"] = len(state["results"])
        state["current"] = None

    state["running"] = False
    state["finished_at"] = time.strftime("%Y-%m-%dT%H:%M:%S")


def stop_simulation() -> bool:
    global _runner
    with _run_lock:
        if _runner and _runner.is_alive():
            _runner.stop()
            _runner.join(timeout=3)
            _runner = None
            return True
        return False


def main(argv: list[str] | None = None) -> None:
    global params
    params = parse_args(argv)
    print_header()

    is_single = params.mode in ("single", "web")
    if params.role is None:
        params.role = "primary" if (is_single or params.mode == "wps01") else "worker"

    adm = LocalAdmBESA(alias=params.mode)
    ControlHandler.global_adm = adm

    clock = SimulationClock.get_instance()
    clock.set_current_date("01/01/2024")

    if params.role == "primary":
        print(f"Starting container '{params.mode}' with {params.years} year(s), {params.agents} agents")
        create_services(adm, params)
        GoalRegistry.get_instance()
        PlanRegistry.get_instance()

        if not getattr(params, '_wait', False):
            from ethosterra.guards.heart_beat import init_csv_writer
            csv_path = os.getenv("ETHOSTERRA_LOGS_PATH", "data/logs/wpsSimulator.csv")
            init_csv_writer(csv_path)
            create_peasants(adm, params)

        ws_server = ViewerWSServer(host="0.0.0.0", port=8000)
        ws_server.start()
        set_ws_server(ws_server)
        print("WebSocket server started on ws://0.0.0.0:8000/wpsViewer")

        http_server = HTTPServer(("0.0.0.0", 8001), ControlHandler)
        http_thread = threading.Thread(target=http_server.serve_forever, daemon=True)
        http_thread.start()
        print("Control API started on http://0.0.0.0:8001 (POST /start, GET /status)")

        if not getattr(params, '_wait', False):
            print("Simulation running with decentralized agents...")
            target_days = params.years * 365
            try:
                import time as _time
                while True:
                    _time.sleep(1)
                    all_agents = adm.get_agents()
                    peasants_done = all(
                        hasattr(a, 'state') and getattr(a.state, 'current_day', 0) >= target_days
                        for a in all_agents
                        if 'PeasantFamily' in getattr(a, 'alias', '')
                    )
                    if peasants_done:
                        print("All agents completed their simulation cycles.")
                        break
            except KeyboardInterrupt:
                print("\nShutting down...")
            adm.shutdown(timeout=5.0)
            elapsed = time.time() - start_time
            print(f"Simulation finished in {elapsed:.0f} seconds.")
            sys.exit(0)
        else:
            print("WAIT MODE: Send POST /start to http://localhost:8001 to begin simulation")
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                stop_simulation()
                adm.shutdown(timeout=5.0)
                sys.exit(0)
    else:
        print("Worker mode: waiting for instructions...")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            sys.exit(0)


if __name__ == "__main__":
    import os as _os
    _args = sys.argv[1:]
    if _args and _args[0] == '-m':
        _args = _args[2:]
    main(_args)
