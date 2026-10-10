"""One HTTP client for every integration: timeouts, retry with backoff, Retry-After, cancellable sleeps."""

import logging
import threading
from collections.abc import Mapping
from typing import Any

import httpx

log = logging.getLogger("http")

USER_AGENT = "BESTHacks2026-heritage-fetcher/0.1 (https://github.com/MescoCzubinski/BestHacks2026; polite, throttled)"  # Wikimedia requires contact info
BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36"  # the GUGiK geocoder rejects bots
RETRY_STATUS = {429, 500, 502, 503, 504}
MAX_BACKOFF_S = 90.0


class Http:
    def __init__(self, stop: threading.Event, *, attempts: int = 6, timeout: float = 60.0, user_agent: str = USER_AGENT) -> None:
        self._stop = stop
        self._attempts = attempts
        self._client = httpx.Client(timeout=timeout, headers={"User-Agent": user_agent}, follow_redirects=True)

    def close(self) -> None:
        self._client.close()

    def _request(self, method: str, url: str, **kw: Any) -> httpx.Response:
        last: Exception | None = None
        for attempt in range(1, self._attempts + 1):
            if self._stop.is_set():
                raise InterruptedError("shutdown requested")
            wait = min(MAX_BACKOFF_S, 3.0 * attempt)
            try:
                resp = self._client.request(method, url, **kw)
                if resp.status_code not in RETRY_STATUS:
                    resp.raise_for_status()
                    return resp
                retry_after = resp.headers.get("Retry-After", "")
                if retry_after.isdigit():
                    wait = min(MAX_BACKOFF_S, float(retry_after))
                elif resp.status_code == 429:
                    wait = min(MAX_BACKOFF_S, 15.0 * attempt)
                last = httpx.HTTPStatusError(f"HTTP {resp.status_code}", request=resp.request, response=resp)
            except httpx.TransportError as exc:
                last = exc
            log.warning("%s %s failed (%s), attempt %d/%d, waiting %.0fs", method, url.split("?")[0], last, attempt, self._attempts, wait)
            self._stop.wait(wait)
        assert last is not None
        raise last

    def get_json(self, url: str, params: Mapping[str, Any] | None = None, headers: Mapping[str, str] | None = None) -> Any:
        """GET and parse JSON; a truncated body (the server cut a large response) is retried like a network error."""
        for attempt in range(1, self._attempts + 1):
            try:
                return self._request("GET", url, params=params, headers=headers).json()
            except ValueError as exc:
                log.warning("GET %s returned unparseable JSON (%s), attempt %d/%d", url.split("?")[0], exc, attempt, self._attempts)
                self._stop.wait(min(MAX_BACKOFF_S, 5.0 * attempt))
        raise ValueError(f"no valid JSON from {url.split('?')[0]} after {self._attempts} attempts")

    def get_bytes(self, url: str, params: Mapping[str, Any] | None = None) -> bytes:
        return self._request("GET", url, params=params).content

    def post_json(self, url: str, payload: Any, headers: Mapping[str, str] | None = None) -> Any:
        return self._request("POST", url, json=payload, headers=headers).json()

    def post_form_json(self, url: str, data: Mapping[str, Any]) -> Any:
        return self._request("POST", url, data=data).json()

    def sleep(self, seconds: float) -> None:
        self._stop.wait(seconds)
