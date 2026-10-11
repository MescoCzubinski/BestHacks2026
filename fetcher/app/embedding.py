"""Embeddings come from the backend, so the model lives in one place and this image stays small.

Vectors are kept as float32 and cached on disk by text hash: a weekly re-run only sends the texts that
changed, which spares both this process and the backend's CPU.
"""

import hashlib
import logging
import threading
import time
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import numpy as np

from .http import Http

log = logging.getLogger("embedding")

BATCH_SIZE = 32
BATCH_PAUSE_S = 0.2  # leaves the backend CPU to real users between batches
MAX_TEXT_CHARS = 1000
READY_TIMEOUT_S = 15 * 60
READY_POLL_S = 5.0
HEALTH_PATH = "/api/health"
EMBEDDINGS_PATH = "/api/embeddings"


def _key(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()


class BackendEmbedder:
    def __init__(self, http: Http, base_url: str, token: str, stop: threading.Event, cache_path: Path | None = None) -> None:
        self._http = http
        self._base = base_url.rstrip("/")
        self._headers = {"Authorization": f"Bearer {token}"}
        self._stop = stop
        self._cache_path = cache_path

    def wait_until_ready(self) -> None:
        """Block until the backend answers its health check, or raise after the timeout."""
        deadline = time.monotonic() + READY_TIMEOUT_S
        while True:
            try:
                self._http.get_json(self._base + HEALTH_PATH)
                return
            except Exception as exc:
                if time.monotonic() > deadline:
                    raise RuntimeError(f"backend not healthy at {self._base}{HEALTH_PATH}") from exc
                log.info("waiting for the backend (%s)", exc.__class__.__name__)
            if self._stop.wait(READY_POLL_S):
                raise InterruptedError("shutdown requested")

    def embed(self, texts: Sequence[str]) -> np.ndarray:
        clipped = [t[:MAX_TEXT_CHARS] or "." for t in texts]
        keys = [_key(t) for t in clipped]
        known = self._load()
        todo: dict[str, str] = {k: t for k, t in zip(keys, clipped) if k not in known}
        log.info("embeddings: %d texts, %d reused from the cache, %d to request", len(texts), len(set(keys)) - len(todo), len(todo))

        items = list(todo.items())
        for i in range(0, len(items), BATCH_SIZE):
            if i and self._stop.wait(BATCH_PAUSE_S):
                raise InterruptedError("shutdown requested")
            batch = items[i : i + BATCH_SIZE]
            body: Any = self._http.post_json(self._base + EMBEDDINGS_PATH, {"texts": [t for _, t in batch]}, headers=self._headers)
            got = body["vectors"]
            if len(got) != len(batch):
                raise ValueError(f"backend returned {len(got)} vectors for {len(batch)} texts")
            rows = np.asarray(got, dtype=np.float32)
            for (k, _), row in zip(batch, rows):
                known[k] = row
            if (i // BATCH_SIZE) % 50 == 0:
                log.info("embedded %d/%d new texts", min(i + BATCH_SIZE, len(items)), len(items))

        if not keys:
            return np.zeros((0, 0), dtype=np.float32)
        out = np.vstack([known[k] for k in keys])
        if items:
            self._save({k: known[k] for k in dict.fromkeys(keys)})
        return out

    def _load(self) -> dict[str, np.ndarray]:
        if self._cache_path is None or not self._cache_path.exists():
            return {}
        try:
            with np.load(self._cache_path, allow_pickle=False) as f:
                return {str(k): row for k, row in zip(f["keys"], f["vectors"])}
        except Exception as exc:  # a damaged cache only costs a re-embed
            log.warning("ignoring unreadable embedding cache %s: %s", self._cache_path, exc)
            return {}

    def _save(self, vectors: dict[str, np.ndarray]) -> None:
        """Keep only the texts of this run, so the cache never grows past one region."""
        if self._cache_path is None:
            return
        tmp = self._cache_path.with_suffix(".tmp.npz")
        try:
            np.savez(tmp, keys=np.array(list(vectors)), vectors=np.vstack(list(vectors.values())))
            tmp.replace(self._cache_path)
        except OSError as exc:
            log.warning("could not write the embedding cache: %s", exc)
