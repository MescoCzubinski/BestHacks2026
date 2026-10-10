"""Tiny JSON file cache so a restart or a rate-limited source never forces a full re-download."""

import json
import logging
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

log = logging.getLogger("cache")


class Cache:
    def __init__(self, root: Path, region_id: str) -> None:
        self._root = root / region_id
        self._root.mkdir(parents=True, exist_ok=True)

    def path(self, name: str) -> Path:
        return self._root / f"{name}.json"

    def get(self, name: str, ttl_s: float) -> Any | None:
        p = self.path(name)
        if p.exists() and time.time() - p.stat().st_mtime < ttl_s:
            return json.loads(p.read_text(encoding="utf-8"))
        return None

    def put(self, name: str, value: Any) -> None:
        tmp = self.path(name).with_suffix(".tmp")
        tmp.write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")
        tmp.replace(self.path(name))

    def load_or_fetch(self, name: str, ttl_s: float, fetch: Callable[[], Any]) -> Any:
        hit = self.get(name, ttl_s)
        if hit is not None:
            log.info("cache hit: %s", name)
            return hit
        value = fetch()
        self.put(name, value)
        return value
