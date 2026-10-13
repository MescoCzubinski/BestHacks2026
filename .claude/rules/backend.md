---
paths:
  - "backend/**"
---

# Backend rules (NestJS, vertical slices)

The backend is the **single source of truth and control point for reads**: all business logic and all validation live here. It is a **read-only consumer of the database**: it never writes, creates or alters anything. Data is written only by the fetcher; the schema lives in `db/` (see `database.md`). The backend has no auth and is not published: it is reachable only inside the cluster network, through the ingress (public routes only) and by the fetcher directly.

## Structure: vertical slice

Each feature is a folder under `backend/src/` that owns everything it needs, from HTTP down to the database. Only `<slice>.module.ts` and `<slice>.integration.spec.ts` sit in the slice root:

```
src/
  main.ts                 bootstrap only
  app.module.ts           imports every slice module
  common/                 cross-cutting code only (auth, db setup, env, shared filters, the bus)
  <slice>/                e.g. route/
    <slice>.module.ts     slice root: module + integration test only
    <slice>.integration.spec.ts
    handlers/             application layer (see below)
      <slice>.controller.ts
      dto/                create-/update-/query- DTOs (class-validator)
      guards/, filters/   slice-specific only; global ones live in common/
    services/             ALL business logic, one class per responsibility
      <name>.service.spec.ts      unit test next to the service
    repositories/         ALL database reads
      <name>.repository.spec.ts   test next to the repository
    entities/             TypeORM entities = read mappings of tables defined in db/
    exceptions/           domain exceptions
```

## Layers (one-directional: handler → service → repository)

1. **Handlers = application layer, nothing else.** A controller, its DTOs, guards and exception filters. Zero logic: no business `if`, no calculations, no mapping beyond HTTP ↔ one service call. A controller method is: validate (pipe/DTO) → call one service → return.
2. **Services = 100% of the logic.** Every rule, calculation, decision, orchestration and mapping lives here. Single responsibility, SOLID (below). Services never touch `Request`/`Response`, `Repository<T>` or `EntityManager`; they use repositories.
3. **Repositories = database reads only.** Query the database and return plain typed data, nothing more: no business rules, no calls to services, no writes (the DB role cannot write anyway). Only repositories inject `Repository<T>`/`DataSource`.

## Slices are isolated

- **A slice never calls another slice.** No importing another slice's service, repository, entity or module, and no calling its methods. A slice may import only from itself, `common/` and npm packages.
- Slices talk only through the **bus** (`common/bus/`), one injectable `EventBus` with two typed mechanisms. The contracts (`Events`, `Requests`) are declared once in `common/bus/` and are the only thing slices share:
  - **Request/reply** when A needs data to build its answer. `const bbox = await bus.request("city.bbox", { cityId })`. Exactly one slice registers a responder with `bus.respond("city.bbox", handler)`; a request with no responder or a failing responder rejects (domain exception).
  - **Event** when A announces a fact and does not care who reacts. Fire-and-forget: `bus.emit("session.created", code)`.
- Request/event names are `<aggregate>.<what>` (`city.bbox`) or `<aggregate>.<past-tense-fact>` (`session.created`). Payloads and replies are plain data (ids, primitives, plain objects), never entities.
- The emitting/requesting slice calls the bus from a **service**. The receiving slice registers responders and subscribes in `handlers/<name>.listener.ts`, which only delegates to one service (zero logic, like a controller).
- Types used by two slices (e.g. `LatLng`, `StyleTag`) live in `common/`, never imported from a slice.
- DTOs live in `handlers/dto/` and never leave the HTTP layer: services take plain typed inputs.

## Services: SOLID, above all single responsibility

- **One service = one reason to change.** Do not build a god `XService`. Split by responsibility, e.g. `PlaceQueryService` (reads), `RoutePlannerService` (the algorithm), `RouteDistanceService` (geometry), `PlaceImportService` (loading external data).
- A service may inject other services of the same slice (never from another slice). Dependencies form an acyclic graph: higher-level services call lower-level ones, never back up. The controller calls the one service that implements the use case.
- Depend on abstractions you can swap or mock (inject providers, use `InjectionToken`/interfaces for external APIs, AI and geocoding); never `new` a collaborator inside a service.
- Open/closed: extend behaviour with a new provider/strategy (e.g. a new interest or scoring strategy) instead of growing `if/else` chains.
- Keep services free of HTTP concerns (`Request`, status codes); they throw domain exceptions (handled by the exception filter).
- Keep pure logic (scoring, route fitting, distance) in pure functions or small classes so it is trivially unit-testable.

## Control over everything

- Every environment variable is read and validated in one place (`common/env.ts` + `ConfigService`). Missing config fails at boot.
- There are no users, no JWT and no service tokens. The backend publishes no port; the ingress (Vite dev proxy locally) routes `/api` to it and forwards **only an allowlist of public routes** (`/api/places`, `/api/routes`, `/api/tags`, `/api/embeddings/warmup`, ...). Internal routes (bulk `POST /api/embeddings` for the fetcher) are not in the allowlist, so they are reachable only inside the cluster. The global throttler (rate limit) covers every endpoint, expensive ones (route planning, embeddings) get a stricter limit, and `trust proxy` is on so limits use the real client IP from `X-Forwarded-For`.
- Heavy resources (the embedding model) load **lazily** on first use or on an explicit `POST /api/embeddings/warmup` that the frontend calls when a session starts, and unload after an idle TTL (a named constant with a unit comment). Loading and unloading live in one lifecycle service, separate from the embedding logic.
- Every request body and query has a DTO (in `handlers/dto/`) with a whitelist. Unknown fields are stripped or rejected. Never trust input from the frontend or the fetcher.
- Return plain response shapes (not raw entities when they contain internal fields).
- External calls (APIs, AI providers) go through one service per integration so they can be mocked, rate limited and logged.

## Database: read-only, schema lives in db/

- The backend connects as the `backend_ro` role (`SELECT` only). Writes are impossible by permission, not just by convention: no `save`, `insert`, `update`, `delete` in the backend.
- **The schema and the roles are defined in `db/init/*.sql`**, applied by Postgres on the first start of the volume. Entities only **map** existing tables; `synchronize` is off. Entity and SQL must agree: the integration tests run against the real schema from `db/`.
- **No migrations.** MVP with no production data. A schema change means editing `db/init/` and the entity, then resetting the `pgdata` volume.
- Each slice registers its entities with `TypeOrmModule.forFeature([...])`. `autoLoadEntities` is on.
- The backend has no seed. Demo and real data come only from the fetcher.
- Details of the data model (document style on Postgres) are in `database.md`.

## Validation and errors

- DTOs (`handlers/dto/`) use `class-validator` with `!` on each field; `Update…Dto` is `PartialType(Create…Dto)`. Global `ValidationPipe({ whitelist: true, transform: true })`. Every string gets a `MaxLength`.
- **Use exception filters.** Services throw framework-free domain exceptions (`extends DomainException` from `common/errors/`, with a `kind`: `invalid`, `not_found`, `unavailable`), one per file in the slice's `exceptions/`. A global `DomainExceptionFilter` (registered with `APP_FILTER`) maps them to HTTP status and a uniform `{ statusCode, error, message }` body. Services and controllers never build HTTP responses or throw `HttpException` for business cases.
- Add a further `@Catch()` filter in `common/errors/` when a new class of error needs its own mapping (e.g. external API failures to 502), instead of try/catch in controllers.
- Status codes: 400 invalid, 404 missing, 429 rate limited, 502/503 upstream unavailable (the filter's mapping is the single source).

## REST conventions

The backend only reads: `GET /places` (200, list), `GET /places/:id` (200). `POST` is allowed only for computations that change nothing (`POST /routes` builds a route, `POST /embeddings` embeds texts, `POST /embeddings/warmup` loads the model). No `PATCH`/`PUT`/`DELETE`. The global prefix is `/api`. Ids are UUIDs.

## Code style

- Constructor injection with `private readonly`. One `Logger` per service: `log` for state changes, `warn` for rejected requests, `debug` for noise.
- Relative imports inside `src/`, `import type` for types. Strict `tsconfig`, decorators on.
- Name time constants in SCREAMING_SNAKE_CASE with a unit comment.

## Testing

Hackathon pace, but the backend is where correctness matters. Tests are **colocated with the code they test**. No coverage percentage targets: test what has logic.

- **Services: unit tests**, one `<name>.service.spec.ts` per service next to it. Collaborators (repositories, bus, external clients) are mocked. Cover business rules, branches and every domain exception.
- **Repositories: tests** for each repository next to it (`<name>.repository.spec.ts`). Mocking the TypeORM layer is allowed.
- **Handlers are not tested.** They contain no logic (controllers, DTOs, guards, filters, listeners); the integration test below covers them.
- **One integration test per module (not e2e)**: `<slice>.integration.spec.ts` next to `<slice>.module.ts`, using `supertest` against the Nest app with the real module wiring. It exercises the slice's main paths end to end (HTTP → service → repository) and the error mapping (validation failure, not found, upstream unavailable).
- Test behaviour and error cases, not implementation details. No tests for trivial getters or plain CRUD wiring.
- Runner: `bun test` (Jest-compatible API: `describe`, `it`, `expect`, `jest.fn`) straight on the TypeScript sources, no build step. `bun run test` runs all `*.spec.ts` (including integration); `bun run test:integration` runs only the integration tests. Integration tests that need Postgres skip unless `TEST_DATABASE_URL` points to a throwaway server.

## Checks

From `backend/`: `bun run lint && bun run typecheck && bun run test`. The runtime and package manager is Bun (`oven/bun` images, `bun.lock`).
