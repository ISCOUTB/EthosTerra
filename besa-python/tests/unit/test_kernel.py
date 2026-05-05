import time
import threading
from dataclasses import dataclass

from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from besa.kernel.agent import AgentBESA
from besa.local.local_adm import LocalAdmBESA


@dataclass(slots=True)
class PingState:
    pong_count: int = 0
    responses: list[str] = None

    def __post_init__(self):
        if self.responses is None:
            self.responses = []


class PingGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        state = self.get_state()
        if event.data and event.data.get("msg") == "pong":
            state.pong_count += 1
            state.responses.append(f"pong-{state.pong_count}")


class PongGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        state = self.get_state()
        if event.data and event.data.get("msg") == "ping":
            state.pong_count += 1
            if event.sender:
                self._agent.send(event.sender, EventBESA(guard_type=PingGuard, data={"msg": "pong"}))


@dataclass(slots=True)
class PongState:
    pong_count: int = 0


def test_pingpong_two_agents():
    adm = LocalAdmBESA(alias="test-adm")

    ping = AgentBESA(alias="ping-agent", state=PingState())
    pong = AgentBESA(alias="pong-agent", state=PongState())

    ping.register_guard(PingGuard)
    pong.register_guard(PongGuard)

    adm.register_agent(ping)
    adm.register_agent(pong)

    adm.start_all()

    for i in range(5):
        ping.send("pong-agent", EventBESA(guard_type=PongGuard, data={"msg": "ping"}))
        time.sleep(0.05)

    time.sleep(0.5)

    adm.shutdown(timeout=3.0)

    assert ping.state.pong_count == 5, f"Expected 5 pongs, got {ping.state.pong_count}"
    assert pong.state.pong_count == 5, f"Expected 5 pings, got {pong.state.pong_count}"
    print(f"PingPong OK: {ping.state.pong_count} messages exchanged")

    adm2 = LocalAdmBESA(alias="perf-adm")
    ping2 = AgentBESA(alias="ping-perf", state=PingState())
    pong2 = AgentBESA(alias="pong-perf", state=PongState())
    ping2.register_guard(PingGuard)
    pong2.register_guard(PongGuard)
    adm2.register_agent(ping2)
    adm2.register_agent(pong2)
    adm2.start_all()
    time.sleep(0.1)

    n = 50
    start = time.perf_counter()
    for i in range(n):
        ping2.send("pong-perf", EventBESA(guard_type=PongGuard, data={"msg": "ping"}))
        time.sleep(0.01)
    time.sleep(2.0)
    elapsed = time.perf_counter() - start
    adm2.shutdown(timeout=5.0)

    throughput = n / elapsed
    print(f"Throughput: {throughput:.0f} events/sec")
    assert ping2.state.pong_count == n, f"Expected {n} pongs, got {ping2.state.pong_count}"

    print("ALL TESTS PASSED")


if __name__ == "__main__":
    test_pingpong_two_agents()
