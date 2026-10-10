"""Heritage data worker: for a configured region, fetches public sources, merges and tags places, writes them to Postgres."""

import json
import logging
import signal
import threading
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from .config import Settings, load_settings
from .http import Http
from .job import run
from .pipeline.tagging import SentenceTransformerEmbedder

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("fetcher")

HEARTBEAT_S = 60
FAILURE_RETRY_S = 900  # wait before retrying a failed run
HEALTH_GRACE_S = 3 * 3600  # a run is allowed to take this long before the container is reported unhealthy

stop = threading.Event()
started_at = time.time()
last_success: float | None = None
run_started: float | None = None
interval_s = 0


def is_healthy() -> bool:
    """Healthy while a run is in progress (within the grace period) or the last success is recent."""
    now = time.time()
    if run_started is not None and now - run_started < HEALTH_GRACE_S:
        return True
    reference = last_success or started_at
    return now - reference < interval_s * 2 + HEALTH_GRACE_S


class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path != "/api/health":
            self.send_error(404)
            return
        ok = is_healthy()
        body = json.dumps(
            {
                "status": "ok" if ok else "unhealthy",
                "uptime_seconds": int(time.time() - started_at),
                "running": run_started is not None,
                "last_success": datetime.fromtimestamp(last_success, timezone.utc).isoformat() if last_success else None,
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
    while not stop.wait(HEARTBEAT_S):
        log.info("alive (uptime=%ds, running=%s, healthy=%s)", int(time.time() - started_at), run_started is not None, is_healthy())


def run_forever(settings: Settings) -> None:
    global last_success, run_started
    http = Http(stop)
    embedder = SentenceTransformerEmbedder(settings.model_name)
    try:
        while not stop.is_set():
            run_started = time.time()
            delay = settings.interval_s
            try:
                report = run(settings, http, embedder)
                last_success = time.time()
                log.info("run finished: %s", json.dumps({k: v for k, v in report.items() if k != "tag_counts"}, ensure_ascii=False))
            except InterruptedError:
                break
            except Exception:
                log.exception("run failed")
                delay = FAILURE_RETRY_S
            finally:
                run_started = None
            if settings.run_once:
                break
            stop.wait(delay)
    finally:
        http.close()


def main() -> None:
    global interval_s
    settings = load_settings()
    interval_s = settings.interval_s
    signal.signal(signal.SIGTERM, lambda *_: stop.set())
    signal.signal(signal.SIGINT, lambda *_: stop.set())

    server = ThreadingHTTPServer(("0.0.0.0", settings.health_port), HealthHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    threading.Thread(target=heartbeat, daemon=True).start()
    log.info("fetcher started: region=%s sources=%s interval=%ds run_once=%s", settings.region.id, ",".join(settings.sources), settings.interval_s, settings.run_once)

    run_forever(settings)
    server.shutdown()
    log.info("shutdown")


if __name__ == "__main__":
    main()
