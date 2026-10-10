"""Periodically fetches data from a public API."""

import json
import logging
import os
import signal
import threading
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import httpx
import psycopg

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("fetcher")

DB_URL = os.environ["DB_URL"]

INTERVAL = 300  # seconds between fetches
HEARTBEAT = 60  # seconds between "alive" log lines
HEALTH_PORT = 8000
LATITUDE = "52.23"
LONGITUDE = "21.01"

SOURCE = "open-meteo"
URL = "https://api.open-meteo.com/v1/forecast"

stop = threading.Event()
started_at = time.time()
last_success: float | None = None


def is_healthy() -> bool:
    """Healthy while fetches succeed; allow 3 missed intervals (and a startup grace period)."""
    reference = last_success or started_at
    return time.time() - reference < INTERVAL * 3 + 30


class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path != "/health":
            self.send_error(404)
            return
        ok = is_healthy()
        body = json.dumps(
            {
                "status": "ok" if ok else "unhealthy",
                "uptime_seconds": int(time.time() - started_at),
                "last_success": (
                    datetime.fromtimestamp(last_success, timezone.utc).isoformat()
                    if last_success
                    else None
                ),
            }
        ).encode()
        self.send_response(200 if ok else 503)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_: object) -> None:  # keep logs free of healthcheck noise
        pass


def heartbeat() -> None:
    while not stop.wait(HEARTBEAT):
        log.info("alive (uptime=%ds, healthy=%s)", int(time.time() - started_at), is_healthy())


def fetch(client: httpx.Client) -> list[tuple[str, str, float, datetime]]:
    resp = client.get(
        URL,
        params={
            "latitude": LATITUDE,
            "longitude": LONGITUDE,
            "current": "temperature_2m,wind_speed_10m",
        },
    )
    resp.raise_for_status()
    current = resp.json()["current"]
    observed_at = datetime.fromisoformat(current["time"]).replace(tzinfo=timezone.utc)
    return [
        (SOURCE, metric, float(current[metric]), observed_at)
        for metric in ("temperature_2m", "wind_speed_10m")
    ]


def main() -> None:
    global last_success
    signal.signal(signal.SIGTERM, lambda *_: stop.set())
    signal.signal(signal.SIGINT, lambda *_: stop.set())

    server = ThreadingHTTPServer(("0.0.0.0", HEALTH_PORT), HealthHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    threading.Thread(target=heartbeat, daemon=True).start()
    log.info("fetcher started: interval=%ds, health on :%d/health", INTERVAL, HEALTH_PORT)

    with httpx.Client(timeout=10) as client, psycopg.connect(DB_URL, autocommit=True) as conn:
        while not stop.is_set():
            try:
                conn.execute("SELECT 1")  # DB reachable; add inserts here once a schema exists
                rows = fetch(client)
                last_success = time.time()
                for _, metric, value, observed_at in rows:
                    log.info("%s = %s (observed %s)", metric, value, observed_at.isoformat())
            except (httpx.HTTPError, psycopg.Error, KeyError, ValueError) as exc:
                log.warning("fetch failed: %s", exc)
            stop.wait(INTERVAL)
    server.shutdown()
    log.info("shutdown")


if __name__ == "__main__":
    main()
