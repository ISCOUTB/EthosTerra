import csv
import threading
from pathlib import Path
from typing import Optional


class CSVWriter:
    COLUMNS = [
        "date", "agent", "money", "health", "happiness", "emotion",
        "current_goal", "harvested_weight", "lands_count", "loans_active",
        "days_in_crisis", "social_capital", "food_security", "task_log"
    ]

    def __init__(self, output_path: Path):
        self._lock = threading.Lock()
        self._file = open(output_path, "w", newline="")
        self._writer = csv.DictWriter(self._file, fieldnames=self.COLUMNS)
        self._writer.writeheader()

    def write_row(self, row: dict) -> None:
        with self._lock:
            self._writer.writerow(row)
            self._file.flush()

    def close(self) -> None:
        self._file.close()
