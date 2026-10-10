"""Embeddings come from the backend, so the model lives in one place and this image stays small."""

import logging
import threading
import time
from collections.abc import Sequence
from typing import Any

import numpy as np

from .http import Http

log = logging.getLogger("embedding")

BATCH_SIZE = 32
MAX_TEXT_CHARS = 1000
READY_TIMEOUT_S = 15 * 60
READY_POLL_S = 5.0
HEALTH_PATH = "/api/health"
EMBEDDINGS_PATH = "/api/embeddings"


class BackendEmbedder:
    def __init__(self, http: Http, base_url: str, token: str, stop: threading.Event) -> None:
        self._http = http
        self._base = base_url.rstrip("/")
        self._headers = {"Authorization": f"Bearer {token}"}
        self._stop = stop

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
        vectors: list[list[float]] = []
        for i in range(0, len(texts), BATCH_SIZE):
            batch = [t[:MAX_TEXT_CHARS] or "." for t in texts[i : i + BATCH_SIZE]]
            body: Any = self._http.post_json(self._base + EMBEDDINGS_PATH, {"texts": batch}, headers=self._headers)
            got = body["vectors"]
            if len(got) != len(batch):
                raise ValueError(f"backend returned {len(got)} vectors for {len(batch)} texts")
            vectors.extend(got)
            if (i // BATCH_SIZE) % 50 == 0:
                log.info("embedded %d/%d texts", min(i + BATCH_SIZE, len(texts)), len(texts))
        return np.asarray(vectors, dtype=np.float32)
