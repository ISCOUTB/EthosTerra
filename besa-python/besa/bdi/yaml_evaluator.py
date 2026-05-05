from __future__ import annotations

import re
from types import SimpleNamespace
from typing import Any


def _to_bool(val: Any) -> bool:
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return val != 0
    if isinstance(val, str):
        return val.lower() in ("true", "1", "yes")
    return bool(val)


_CAMEL_TO_SNAKE = re.compile(r'(?<!^)(?=[A-Z])')


class _StateProxy:
    def __init__(self, believes: Any):
        self._believes = believes

    def __getattr__(self, name: str) -> Any:
        obj = self._believes
        try:
            return getattr(obj, name)
        except AttributeError:
            snake = _CAMEL_TO_SNAKE.sub('_', name).lower()
            try:
                return getattr(obj, snake)
            except AttributeError:
                raise AttributeError(f"No attribute {name} or {snake} on {type(obj).__name__}")

    def __bool__(self) -> bool:
        return True


def _build_namespace(believes: Any) -> dict[str, Any]:
    ns: dict[str, Any] = {}
    if believes is None:
        return ns

    for key in dir(believes):
        if key.startswith('_'):
            continue
        try:
            ns[key] = getattr(believes, key)
        except Exception:
            pass

    ns['state'] = _StateProxy(believes)
    ns['belief'] = _StateProxy(believes)
    return ns


def _eval_expr(believes: Any, expression: str) -> float:
    try:
        s = expression.strip()

        s = re.sub(r'\btrue\b', 'True', s)
        s = re.sub(r'\bfalse\b', 'False', s)
        s = s.replace('&&', ' and ').replace('||', ' or ')
        s = re.sub(r'!(\w)', r'not \1', s)
        s = re.sub(r'!\s*\(', 'not (', s)

        def replace_ternary(m: re.Match) -> str:
            return f"({m.group(2).strip()}) if ({m.group(1).strip()}) else ({m.group(3).strip()})"
        s = re.sub(r'\(([^()]+)\)\s*\?\s*([^:]+)\s*:\s*([^()\n]+)', replace_ternary, s)

        s = re.sub(r'belief\.get\(\s*[\'"](\w+)[\'"]\s*\)', r'state.\1', s)
        s = re.sub(r'calendar\.getDaysBetweenDates\(([^)]+)\)', r'0', s)
        s = re.sub(r'(\w+)\.size\(\)', r'len(\1)', s)

        s = re.sub(r'state\.peasantProfile\.(\w+)', r'state.\1', s)

        ns = _build_namespace(believes)

        result = eval(s, {"__builtins__": {}}, ns)
        return 1.0 if _to_bool(result) else 0.0
    except Exception:
        return 0.0


def evaluate_activation(believes: Any, activation_when: str) -> float:
    if not activation_when or activation_when.lower() in ("false", "0"):
        return 0.0
    if activation_when.lower() in ("true", "1"):
        return 1.0
    if activation_when == "llm":
        return 0.5
    return _eval_expr(believes, activation_when)
