---
paths:
  - "backend/**"
---

# Backend rules (NestJS, vertical slices)

The backend is the **single source of truth and control point for reads**: all business logic and all validation live here. It is a **read-only consumer of the database**: it never writes, creates or alters anything. Data is written only by the fetcher, which also owns the schema (see `database.md`). The backend has no auth and is not published: it is reachable only inside the cluster network, through the ingress (`/api` only) and by the fetcher directly.

## Structure: vertical slice

Each feature is a folder under `backend/src/` that owns everything it needs, from HTTP down to the database. Only `<slice>.module.ts` and `<slice>.integration.spec.ts` sit in the slice root:

```
src/
  main.ts                 bootstrap only
  app.module.ts           imports every slice module
  common/                 cross-cutting code only (auth, db setup, env, shared filters, the bus)
  <slice>/                location/, tag/, places/, directions/, health/
    <slice>.module.ts     slice root: module + integration test only
    <slice>.integration.spec.ts
    handlers/             application layer (see below)
      <slice>.controller.ts
      dto/                create-/update-/query- DTOs (class-validator)
      guards/, filters/   slice-specific only; global ones live in common/
    services/             ALL business logic: usually one <slice>.service.ts, plus a <name>.client.ts per external API
      <name>.service.spec.ts      unit test next to the service
      types.ts, <pure>.ts         shared slice types; pure logic as plain functions (no class, no DI)
    repositories/         ALL database reads
      <name>.repository.spec.ts   test next to the repository
    entities/             TypeORM entities = read mappings of tables in fetcher/app/schema.sql
    exceptions/           domain exceptions
```

## Layers (one-directional: handler → service → repository)

1. **Handlers = application layer, nothing else.** A controller, its DTOs, guards and exception filters. Zero logic: no business `if`, no calculations, no mapping beyond HTTP ↔ one service call. A controller method is: validate (pipe/DTO) → call one service → return.
2. **Services = 100% of the logic.** Every rule, calculation, decision, orchestration and mapping lives here (see below). Services never touch `Request`/`Response`, `Repository<T>` or `EntityManager`; they use repositories.
3. **Repositories = database reads only.** Query the database and return plain typed data, nothing more: no business rules, no calls to services, no writes. Only repositories inject `Repository<T>`/`DataSource`.

## Slices are isolated

- **A slice never calls another slice.** No importing another slice's service, repository, entity or module, and no calling its methods. A slice may import only from itself, `common/` and npm packages.
- Slices talk only through the **bus** (`common/bus/`), one injectable `EventBus` with two typed mechanisms. The contracts (`Events`, `Requests`) are declared once in `common/bus/` and are the only thing slices share:
  - **Request/reply** when A needs data to build its answer. `await bus.request("location.ensure-inside", { points })`. Exactly one slice registers a responder with `bus.respond("location.ensure-inside", handler)`; a request with no responder or a failing responder rejects (domain exception).
  - **Event** when A announces a fact and does not care who reacts. Fire-and-forget: `bus.emit("session.created", code)`.
- Request/event names are `<aggregate>.<what>` (`directions.route`) or `<aggregate>.<past-tense-fact>` (`session.created`). Payloads and replies are plain data (ids, primitives, plain objects), never entities.
- The emitting/requesting slice calls the bus from a **service**. The receiving slice registers responders and subscribes in `handlers/<name>.listener.ts`, which only delegates to one service (zero logic, like a controller).
- Small shapes and DTOs (`LatLng`, `Bbox`, `PointDto`) are **duplicated in each slice** that needs them, never shared through `common/`. Only `StyleTag` (mirrors the schema enum) and the bus contracts live there. `common/` has no tests.
- DTOs live in `handlers/dto/` and never leave the HTTP layer: services take plain typed inputs.

## Services: few and cohesive

- **One service per slice by default** (`LocationService`, `TagService`, `DirectionsService`). Split only when a service would grow past ~500 lines, along a clear seam (`places` has `PlaceService` for reading places and `PlanService` for planning). Do not split into one class per small responsibility.
- **One client class per external API or heavy resource** (`PhotonClient`, `GraphHopperClient`, `EmbeddingModel`): it owns the HTTP/model calls and maps their responses, so tests can swap it. No abstract class or token in front of it while there is only one implementation.
- **Pure logic is plain exported functions** (`orienteering.ts`, `opening-hours.ts`, `walkMinutes`, `rankTags`), not injectable classes.
- A service may inject other services and clients of the same slice (never from another slice); dependencies form an acyclic graph. The controller calls the service that implements the use case. Never `new` a collaborator inside a service.
- Keep services free of HTTP concerns (`Request`, status codes); they throw domain exceptions (handled by the exception filter).

## Control over everything

- Every environment variable is read and validated in one place (`common/env.ts` + `ConfigService`). Missing config fails at boot.
- There are no users, no JWT and no service tokens. The backend publishes no port; the ingress (Vite dev proxy locally) routes `/api` to it. **One URL prefix per slice:** `/api/locations`, `/api/tags`, `/api/places` (search and `POST /api/places/plan`), `/api/directions`, `/api/health`. The only internal route is the fetcher's bulk `POST /internal/embeddings`, excluded from the `/api` prefix, so the ingress never routes it and it is reachable only inside the cluster. There is no rate limiting in the backend; if needed it is configured on the ingress.
- Heavy resources (the embedding model) load **lazily** on first use or on an explicit `POST /api/tags/warmup` that the frontend calls when a session starts, and unload after an idle TTL (a named constant with a unit comment). Loading and unloading live in one lifecycle service, separate from the embedding logic.
- Every request body and query has a DTO (in `handlers/dto/`) with a whitelist. Unknown fields are stripped or rejected. Never trust input from the frontend or the fetcher.
- Return plain response shapes (not raw entities when they contain internal fields).
- External calls (APIs, AI providers) go through one client per integration so they can be mocked and logged.

## Database: read-only, schema owned by the fetcher

- The backend only reads: no `save`, `insert`, `update`, `delete`. In the cluster its database user (from Kubernetes) has `SELECT` only.
- **The schema is `fetcher/app/schema.sql`**, applied by the fetcher on every run. Entities only **map** existing tables; `synchronize` is off. Entity and SQL must agree: the integration tests run against that real schema.
- **No migrations.** MVP. A schema change means editing `fetcher/app/schema.sql` and the entity together.
- Each slice registers its entities with `TypeOrmModule.forFeature([...])`. `autoLoadEntities` is on.
- The backend has no seed. Demo and real data come only from the fetcher.
- Details of the data model (document style on Postgres) are in `database.md`.

## Validation and errors

- DTOs (`handlers/dto/`) use `class-validator` with `!` on each field; `Update…Dto` is `PartialType(Create…Dto)`. Global `ValidationPipe({ whitelist: true, transform: true })`. Every string gets a `MaxLength`.
- **Use exception filters.** Services throw framework-free domain exceptions (`extends DomainException` from `common/errors/`, with a `kind`: `invalid`, `not_found`, `unavailable`), one per file in the slice's `exceptions/`. A global `DomainExceptionFilter` (registered with `APP_FILTER`) maps them to HTTP status and a uniform `{ statusCode, error, message }` body. Services and controllers never build HTTP responses or throw `HttpException` for business cases.
- Add a further `@Catch()` filter in `common/errors/` when a new class of error needs its own mapping (e.g. external API failures to 502), instead of try/catch in controllers.
- Status codes: 400 invalid, 404 missing, 502/503 upstream unavailable (the filter's mapping is the single source).

## REST conventions

The backend only reads: `GET /places` (200, list), `GET /places/:id` (200). `POST` is allowed only for computations that change nothing (`POST /routes` builds a route, `POST /embeddings` embeds texts, `POST /embeddings/warmup` loads the model). No `PATCH`/`PUT`/`DELETE`. The global prefix is `/api`. Ids are UUIDs.

## Code style

- Constructor injection with `private readonly`. One `Logger` per service: `log` for state changes, `warn` for rejected requests, `debug` for noise.
- Relative imports inside `src/`, `import type` for types. Strict `tsconfig`, decorators on.
- Name time constants in SCREAMING_SNAKE_CASE with a unit comment.

## Testing

Hackathon pace, but the backend is where correctness matters. Tests are **colocated with the code they test**. No coverage percentage targets: test what has logic.

- **Services, clients and pure logic: unit tests**, one spec next to each file (`location.service.spec.ts`, `photon.client.spec.ts`, `orienteering.spec.ts`). Collaborators (repositories, bus, external clients) are mocked. Cover business rules, branches and every domain exception.
- **Repositories: tests** for each repository next to it (`<name>.repository.spec.ts`). Mocking the TypeORM layer is allowed.
- **Handlers are not tested.** They contain no logic (controllers, DTOs, guards, filters, listeners); the integration test below covers them.
- **One integration test per module (not e2e)**: `<slice>.integration.spec.ts` next to `<slice>.module.ts`, using `supertest` against the Nest app with the real module wiring. It exercises the slice's main paths end to end (HTTP → service → repository) and the error mapping (validation failure, not found, upstream unavailable).
- Test behaviour and error cases, not implementation details. No tests for trivial getters or plain CRUD wiring.
- Runner: `bun test` (Jest-compatible API: `describe`, `it`, `expect`, `jest.fn`) straight on the TypeScript sources, no build step. `bun run test` runs all `*.spec.ts` (including integration); `bun run test:integration` runs only the integration tests. Integration tests that need Postgres skip unless `TEST_DATABASE_URL` points to a throwaway server.

## Checks

From `backend/`: `bun run lint && bun run typecheck && bun run test`. The runtime and package manager is Bun (`oven/bun` images, `bun.lock`).
