from typing import Any, Protocol


class LayerCellState(Protocol):
    def to_dict(self) -> dict[str, Any]: ...


class LayerCell(Protocol):
    def get_cell_state(self) -> LayerCellState: ...
    def get_id(self) -> str: ...


class LayerExecutionParams:
    pass


class WorldLayer:
    def __init__(self):
        self._dependant_layers: dict[str, "WorldLayer"] = {}

    def setup_layer(self) -> None:
        pass

    def execute_layer(self, params: LayerExecutionParams | None = None) -> None:
        pass

    def bind_layer(self, name: str, layer: "WorldLayer") -> None:
        self._dependant_layers[name] = layer

    def get_layer(self, name: str) -> "WorldLayer | None":
        return self._dependant_layers.get(name)


class GenericWorldLayer(WorldLayer):
    pass


class LayerExecutor:
    def __init__(self):
        self._layers: list[WorldLayer] = []

    def add_layer(self, *layers: WorldLayer) -> None:
        self._layers.extend(layers)

    def execute_layers(self, params: LayerExecutionParams | None = None) -> None:
        for layer in self._layers:
            layer.execute_layer(params)
