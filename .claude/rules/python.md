---
paths:
  - "fetcher/**"
---

# Python rules (fetcher / data worker)

Python here is a **background worker**, not a second backend. Use it for what Python is best at: fetching external data, parsing, scheduled jobs, ML/AI or data-processing libraries.

- **Isolated service.** Its own folder, `Dockerfile`, `requirements.txt` with pinned versions, and `.env`. The frontend never talks to it.
- **The backend owns the database schema.** The worker writes only to tables defined by NestJS entities, never creates or alters tables, and writes documents in exactly the shape the backend expects (jsonb body, uuid ids, timestamps). If it needs a new table or column, add or change the entity in `backend/` first (schema syncs on backend startup).
- Writes are **idempotent** (`INSERT ... ON CONFLICT DO UPDATE/NOTHING`), so a retry or restart never duplicates data. Use parameterized queries only, never string-built SQL.
- Needs the product to do something with the data (notify, compute, expose)? Call a backend endpoint or let the backend read the table. Business rules stay in NestJS.
- Config only through environment variables (`os.environ[...]`, fails at boot when missing). No secrets in code.
- Layout: `app/main.py` wires and runs; one module per job or integration (`app/sources/<name>.py`, `app/db.py`). Keep functions small and pure where possible (fetch → parse → store as separate steps).
- Type hints everywhere, `logging` (not `print`), timeouts on every network call, retry with backoff for flaky APIs, graceful shutdown on SIGTERM.
- Keep the health endpoint that Docker uses, and the container runs read-only and as non-root.
- Style: PEP 8, 4 spaces, double quotes, f-strings. Use `ruff` for lint/format if added.
- Tests (if any): `pytest` next to the module, only for parsing/transform functions.
