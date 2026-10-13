# Refactor plan (post-hackathon cleanup)

Goal: bring the code in line with the target rules in `.claude/rules/backend.md`, `database.md`, `python.md` and `frontend.md`. Those rules describe the **target state**; this plan describes how to get there.

Each phase is its own branch and PR, and `main` stays demo-ready throughout.

## Decisions

| #   | Decision                                                                                                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Saved routes are removed from the backend and kept in the frontend's `localStorage`.                                                                                                                        |
| 2   | The schema and the roles live in `db/init/*.sql`, applied by Postgres on the first start of the volume. No `synchronize`, no one-shot schema step. Entities only map tables.                                |
| 3   | The backend has no seed. The fetcher is the only writer and also writes the city/region row. `SeedService` and `places.seed.json` go away.                                                                  |
| 4   | The fetcher's run mode (daemon vs on-demand) is **deferred**. For now it writes to the DB and calls the backend for embeddings.                                                                             |
| 5   | The embedding model loads lazily (first use or explicit warmup) and unloads after an idle TTL. If memory does not return to the OS after dispose, move the model to a worker thread that is killed on idle. |

## Current state (what the refactor has to change)

- Users are used by the `account` slice, `saved-route` (`userId`), `JwtAuthGuard`, `RolesGuard`, `demo-user.seed` and the frontend (`login`, `landing`, `shared/auth`).
- The backend creates the schema (`synchronize: true`) and writes data (`SeedService` inserts cities and demo places).
- Cross-slice imports today: `route` → `city`, `path`, `places`; `path` → `city`; `places` → `city`; `tag` → `places`; `saved-route` → `city`, `tag`.
- Shared types owned by a slice but used by others: `LatLng`/`Bbox` (`city/bbox`), `StyleTag` (`places/style-tag`), `PlaceCandidate` (`places`).
- The embedding model already loads lazily (`TransformersEmbedder.load`), but is never released.
- Services inject `Repository<T>` directly; only a few slices have a `repositories/` folder.

## Phase 0: foundation

1. Move `LatLng`, `Bbox` and `StyleTag` to `common/`.
2. Implement `common/bus/`: a typed `EventBus` with `emit`, `request` and `respond`, and the `Events` and `Requests` contracts. Unit tests for it (no responder, failing responder, typed payloads).
3. Add a lint rule that forbids importing from another slice (`src/<slice>/**` may import only itself, `common/` and npm packages). Warning level for now.

Verify: `npm run lint && npm run typecheck && npm test` green.

## Phase 1: remove users

1. Delete the `account` slice, `saved-route`, the JWT and roles guards, `@Roles`/`@Public`/`@CurrentUser`, `JWT_SECRET`, the demo user seed and the related env validation.
2. Add `@nestjs/throttler` as a global guard with a stricter limit on route planning and embeddings, and enable `trust proxy`. Remove `ServiceTokenGuard`, `EMBEDDING_API_TOKEN` and the fetcher's bearer header: the fetcher calls the backend directly inside the Docker network.
3. Frontend: remove login and landing, keep saved routes in `localStorage`.

Verify: the frontend goes through the whole flow (interest → location + time → map → route) without logging in; backend tests green.

## Phase 2: read-only backend, schema in db/

1. Create `db/init/*.sql`: tables (from the current entities), enum `style_tag`, indexes, and the roles `backend_ro` (`SELECT`) and `fetcher_rw` (`INSERT/UPDATE/DELETE`, no DDL).
2. Docker Compose: mount `db/init` into `/docker-entrypoint-initdb.d`; backend `DATABASE_URL` uses `backend_ro`; the fetcher uses `fetcher_rw`.
3. Turn off `synchronize`. Entities map the existing tables.
   Network: the backend publishes no port. The ingress routes `/` to the frontend and `/api` to the backend with an allowlist of public routes (not the bulk `/api/embeddings`); locally the Vite dev proxy does the same. `VITE_API_URL` is replaced by the relative `/api`.
4. Fetcher: write the city/region row too. Remove `SeedModule`, `SeedService`, `city.seed.ts` and `places.seed.json` from the backend.

Verify: an `INSERT` from the backend fails with `permission denied`; a full fetcher run fills the database; the integration tests run against the real schema from `db/`.

## Phase 3: slices, bottom-up

Order: `city` → `places` → `tag` → `path` → `route`. For each slice:

1. Add `repositories/` (reads only). Services stop injecting `Repository<T>`.
2. Replace every cross-slice import with the bus: a responder in the owning slice's `handlers/*.listener.ts`, `bus.request(...)` from the consuming service. Candidate requests: `city.bbox`, `place.candidates`, `place.visit-duration`, `path.route`.
3. Check that handlers contain no logic (controller, DTOs, guards, filters, listeners only).
4. Tests: a spec per service, a spec per repository, and one `<slice>.integration.spec.ts`. For `route` and `path`, write characterization tests of the current behaviour before touching them.
5. Keep services single-responsibility; a service may inject other services of its own slice (acyclic).

Verify per slice: its specs green and no cross-slice imports left in it. After `route`, switch the lint rule from warning to error.

## Phase 4: lazy model

1. Split `TransformersEmbedder` into the embedding logic and a lifecycle service (load on demand, idle TTL as a named constant with a unit, dispose).
2. Add `POST /api/embeddings/warmup`; the frontend calls it when a session starts.
3. The fetcher's `POST /api/embeddings` (service token) wakes the model the same way.

Verify: logs show "model loaded" after the warmup and "model unloaded" after the TTL, and process memory drops. Unit tests for the lifecycle with fake timers.

## Later

- Fetcher run mode (daemon vs on-demand with `run_once` and a compose profile).
- Revisit schema management (migrations) before any real deployment.

## Frontend (separate track, target in `.claude/rules/frontend.md`)

Three screens (`start`, `plan`, `route`) replace Feature-Sliced Design. Plan state lives in the URL, recent routes in `localStorage`.

Current layout to collapse: `app/`, `pages/{home,plan,landing,login}`, `features/{auth,build-route,check-api,edit-route,pick-interests,pick-location,route-map,saved-routes}`, `entities/route`, `shared/{ui,api,auth,lib,config,...}`.

1. **Remove login and auth** (with backend phase 1): `login`, `landing`, `features/auth`, `shared/auth`, `features/check-api`. Saved routes become "recent routes" in `localStorage`.
2. **Create `screens/{start,plan,route}`** and move code in: `pick-interests` and `pick-location` → `plan`; `edit-route`, `route-map`, `RouteSheet`/`RoutePanel` → `route`; `HistoryPanel`/`saved-routes` → `start`. Drop every `index.ts` barrel.
3. **Promote shared code only when two screens use it**: `entities/route` (types, `format`, `totals`) → `lib/` and `api/`, `shared/ui` → `ui/`, the rest of `shared/` → `lib/`, `hooks/`, `api/`.
4. **URL as state**: `/route?tags=..&lat=..&lng=..&min=..`; the route screen builds the route from it. The plan screen only navigates.
5. **Call `POST /api/embeddings/warmup`** when the plan screen opens (backend phase 4).

Verify: `npm run lint && npm run build && npm test` from `frontend/`; the whole flow (start → plan → route) works, including reload and a shared link on `/route`.

## Docker images and deployment

Same pattern as `MescoCzubinski/Meetly` (multi-stage `base` → `dev` / `prod` targets, compose runs `dev`, `ghcr.yml` publishes the `prod` targets on a `v*.*.*` tag). The existing Dockerfiles already follow it; the new architecture changes these points:

1. **Frontend `prod` stays as in Meetly**: build stage, then `serve` for the static `dist/`. Only change: remove the `VITE_API_URL` build arg (the base URL is the relative `/api`). No proxy config in the image; routing is the ingress's job.
2. **Frontend `dev`**: Vite `server.proxy` for `/api` with the same allowlist as the ingress, so dev and prod share the one-host model.
3. **Backend `prod`:** drop the `COPY ... places.seed.json` line (no seed). No published port in any compose file; `EXPOSE` stays as documentation.
4. **New `db` image** (`db/Dockerfile`: `FROM postgres:17-alpine`, `COPY init /docker-entrypoint-initdb.d`) so prod gets the schema and roles without a bind mount. Compose dev may keep mounting `db/init`.
5. **Fetcher image:** drop `HEALTHCHECK` and the health port (on-demand run); keep the non-root, read-only layout. Published as an image, run with `docker compose run --rm fetcher`.
6. **`ghcr.yml`:** build and push four images (`backend`, `frontend`, `db`, `fetcher`), tagged with the version and `latest`; `frontend` loses its `build-args`.
7. **Ingress config** (outside the images): `/` → `frontend:3000`, `/api` → `backend:8000` limited to the allowlist of public routes, `X-Forwarded-For` set. Only the ingress is public; `backend`, `db` and `fetcher` have no external exposure; secrets come from env files or cluster secrets, not git. The allowlist is kept in one place in the repo so dev (Vite proxy) and prod (ingress) do not drift.
8. **`ci.yml`:** add `docker build --target prod` for each image (no push) on pull requests, so a broken Dockerfile fails before a tag.

Verify: behind the ingress the SPA and `/api` answer on one host, `/api/embeddings` (bulk) returns 404 from outside but works from the fetcher inside the cluster, the backend is unreachable directly from outside, and the throttler limit uses the real client IP.
