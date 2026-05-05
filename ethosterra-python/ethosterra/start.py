from __future__ import annotations

import argparse
import os
import sys
import time
import threading
import json
from http.server import HTTPServer, BaseHTTPRequestHandler

from besa.local.local_adm import LocalAdmBESA
from besa.bdi.declarative.goal_registry import GoalRegistry
from besa.bdi.declarative.plan_registry import PlanRegistry

from ethosterra.simulation_params import SimulationParams
from ethosterra.simulation_clock import SimulationClock
from ethosterra.simulation_runner import SimulationRunner
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
    p.agents = max(1, args.agents)
    p._wait = args.wait
    return p


def create_services(adm: LocalAdmBESA) -> None:
    agents = [
        CommunityDynamicsAgent("CommunityDynamics"),
        MarketPlaceAgent("MarketPlace"),
        CivicAuthorityAgent("CivicAuthority", training_slots=10),
        BankOfficeAgent("BankOffice"),
        PerturbationGeneratorAgent("PerturbationGenerator"),
        AgroEcosystemAgent("AgroEcosystem"),
    ]
    for agent in agents:
        adm.register_agent(agent)
    for agent in agents:
        agent.start()


def create_peasants(adm: LocalAdmBESA, sim_params: SimulationParams) -> None:
    from ethosterra.agents.peasant_family import PeasantFamily

    control = SimulationControlAgent(
        f"{sim_params.mode}_SimulationControl",
        total_agents=sim_params.agents,
        years=sim_params.years,
    )
    viewer = ViewerLensAgent(f"{sim_params.mode}_ViewerLens")
    adm.register_agent(control)
    adm.register_agent(viewer)
    control.start()
    viewer.start()

    for i in range(sim_params.agents):
        peasant = PeasantFamily(
            f"{sim_params.mode}PeasantFamily{i + 1}",
            sim_params,
        )
        adm.register_agent(peasant)
        peasant.start()


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

    def do_GET(self) -> None:
        if self.path == "/status":
            self._json({"running": self.global_runner is not None and self.global_runner.is_alive()})
        elif self.path == "/health":
            self._json({"status": "ok"})
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
        else:
            self._json({"error": "not found"}, 404)

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
    global _runner, params
    with _run_lock:
        if _runner and _runner.is_alive():
            return False
        p = SimulationParams()
        p.agents = int(config.get("agents", params.agents))
        p.years = int(config.get("years", params.years))
        p.money = int(config.get("money", params.money))
        p.tools = int(config.get("tools", params.tools))
        p.seeds = int(config.get("seeds", params.seeds))
        p.water = int(config.get("water", params.water))
        p.speed = float(config.get("speed", params.speed))
        p.irrigation = int(config.get("irrigation", 1))
        p.emotions = int(config.get("emotions", 1))
        p.training = int(config.get("training", 1))
        p.mode = config.get("mode", "single")

        adm = ControlHandler.global_adm
        if adm:
            create_peasants(adm, p)

        csv_path = os.getenv("ETHOSTERRA_LOGS_PATH", "data/logs/wpsSimulator.csv")
        _runner = SimulationRunner(
            adm=adm,
            years=p.years,
            agents_count=p.agents,
            tick_seconds=p.speed,
            csv_path=csv_path,
        )
        _runner.start()
        ControlHandler.global_runner = _runner
        return True


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
        create_services(adm)
        GoalRegistry.get_instance()
        PlanRegistry.get_instance()

        if not getattr(params, '_wait', False):
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
            csv_path = os.getenv("ETHOSTERRA_LOGS_PATH", "data/logs/wpsSimulator.csv")
            runner = SimulationRunner(
                adm=adm,
                years=params.years,
                agents_count=params.agents,
                tick_seconds=params.speed,
                csv_path=csv_path,
            )
            runner.start()
            setattr(sys.modules[__name__], '_runner', runner)

            print("Simulation running in auto mode...")
            try:
                while runner.is_alive():
                    runner.join(timeout=1.0)
            except KeyboardInterrupt:
                print("\nShutting down...")
                runner.stop()
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
