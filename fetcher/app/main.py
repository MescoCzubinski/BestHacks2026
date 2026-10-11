"""Heritage data worker: for a configured region, fetches public sources, merges and tags places, writes them to Postgres."""

import json
import logging
import multiprocessing
import signal
import threading
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from multiprocessing.connection import Connection
from typing import Any

from .config import Settings, load_settings
from .embedding import BackendEmbedder
from .http import Http
from .job import run

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("fetcher")

HEARTBEAT_S = 60
FAILURE_RETRY_S = 900  # first retry after a failed run; doubles per consecutive failure
MAX_FAILURE_RETRY_S = 6 * 3600
HEALTH_GRACE_S = 3 * 3600
CHILD_POLL_S = 1.0
CHILD_STOP_GRACE_S = 20

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

    def log_message(self, *_: object) -> None:
        pass


def heartbeat() -> None:
    while not stop.wait(HEARTBEAT_S):
        log.info("alive (uptime=%ds, running=%s, healthy=%s)", int(time.time() - started_at), run_started is not None, is_healthy())


def failure_delay(consecutive_failures: int) -> int:
    """Back off from the public APIs: 15 min, 30 min, 1 h ... capped at 6 h."""
    return min(MAX_FAILURE_RETRY_S, FAILURE_RETRY_S * 2 ** max(0, consecutive_failures - 1))


def _peak_memory_mb() -> int | None:
    try:
        import resource

        return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss // 1024  # KiB on Linux
    except ImportError:
        return None


def _run_in_child(settings: Settings, conn: Connection) -> None:
    """Entry point of the run process: it owns every large object, so exiting returns all of its memory."""
    child_stop = threading.Event()
    signal.signal(signal.SIGTERM, lambda *_: child_stop.set())
    http = Http(child_stop)
    try:
        cache_path = settings.cache_dir / settings.region.id / "embeddings.npz"
        embedder = BackendEmbedder(http, settings.backend_url, settings.embedding_token, child_stop, cache_path)
        report = run(settings, http, embedder)
        report["peak_memory_mb"] = _peak_memory_mb()
        conn.send(("ok", report))
    except InterruptedError:
        conn.send(("stopped", None))
    except Exception as exc:
        log.exception("run failed")
        conn.send(("error", f"{exc.__class__.__name__}: {exc}"))
    finally:
        http.close()
        conn.close()


def run_isolated(settings: Settings) -> dict[str, Any]:
    """Run the pipeline in a short-lived process. An out-of-memory kill ends only that process, not the worker."""
    ctx = multiprocessing.get_context("spawn")  # fork would copy this process's threads and locks
    recv, send = ctx.Pipe(duplex=False)
    proc = ctx.Process(target=_run_in_child, args=(settings, send), name="fetcher-run")
    proc.start()
    send.close()
    try:
        while not recv.poll(CHILD_POLL_S):  # also true at end-of-file, i.e. when the child died silently
            if stop.is_set():
                proc.terminate()  # SIGTERM: the child stops at its next cancellable wait
                raise InterruptedError("shutdown requested")
            if not proc.is_alive() and not recv.poll():
                break  # exited without sending anything
        try:
            message = recv.recv() if recv.poll() else None
        except EOFError:
            message = None
    finally:
        recv.close()
        proc.join(CHILD_STOP_GRACE_S)
        if proc.is_alive():
            proc.kill()
            proc.join()

    if message is None:
        if stop.is_set():
            raise InterruptedError("shutdown requested")
        hint = " (killed, probably out of memory)" if proc.exitcode in (-9, 137) else ""
        raise RuntimeError(f"run process exited with code {proc.exitcode}{hint}")
    status, payload = message
    if status == "stopped":
        raise InterruptedError("shutdown requested")
    if status == "error":
        raise RuntimeError(payload)
    return payload


def run_forever(settings: Settings) -> None:
    global last_success, run_started
    failures = 0
    while not stop.is_set():
        run_started = time.time()
        delay = settings.interval_s
        try:
            report = run_isolated(settings)
            last_success = time.time()
            failures = 0
            log.info("run finished: %s", json.dumps({k: v for k, v in report.items() if k != "tag_counts"}, ensure_ascii=False))
        except InterruptedError:
            break
        except Exception:
            failures += 1
            delay = failure_delay(failures)
            log.exception("run failed (%d in a row), retrying in %ds", failures, delay)
        finally:
            run_started = None
        if settings.run_once:
            break
        stop.wait(delay)


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
