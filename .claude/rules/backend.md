---
paths:
  - "backend/**"
---

# Backend rules (NestJS, vertical slices)

The backend is the **single source of truth and control point**: all business logic, all validation, all access to the database and the schema live here. Other services (frontend, Python fetcher) never get to bypass it.

## Structure: vertical slice

Each feature is a folder under `backend/src/` that owns everything it needs, from HTTP down to the database:

```
src/
  main.ts                 bootstrap only
  app.module.ts           imports every slice module
  common/                 cross-cutting code only (auth, db setup, env, shared pipes/filters)
  <slice>/                e.g. route/
    <slice>.module.ts
    handlers/             HTTP layer
      <slice>.controller.ts
      dto/                create-/update-/query- DTOs (class-validator)
    services/             one class per responsibility (see below)
    entities/             TypeORM entities = the DB schema of this slice
    repositories/         optional; one per business object, not per table (see database.md)
    exceptions/           domain exceptions
    <name>.spec.ts, <slice>.e2e-spec.ts   tests live next to what they test (see testing.md)
```

- A slice never imports another slice's internals (entity, repository). It goes through the other slice's **exported service**, or an event when decoupling matters.
- Put code in `common/` only when two or more slices need it. Do not create "shared" layers speculatively.
- Singular names for folders and classes (`task/`, `TaskService`), plural for routes (`@Controller("tasks")`). Files are kebab-case: `<name>.<role>.ts`.
- Register every new module in `app.module.ts`.
- Flow is one-directional: **controller → service → entity/repository**. Controllers only map HTTP to one service call. DTOs live in `handlers/dto/` and never leave the HTTP layer: services take plain typed inputs or the DTO type only at the boundary.

## Services: SOLID, above all single responsibility

- **One service = one reason to change.** Do not build a god `XService`. Split by responsibility, e.g. `PlaceQueryService` (reads), `RoutePlannerService` (the algorithm), `RouteDistanceService` (geometry), `PlaceImportService` (loading external data).
- A controller may call a thin orchestrating service that composes the small ones; the small ones do not call back up.
- Depend on abstractions you can swap or mock (inject providers, use `InjectionToken`/interfaces for external APIs, AI and geocoding); never `new` a collaborator inside a service.
- Open/closed: extend behaviour with a new provider/strategy (e.g. a new interest or scoring strategy) instead of growing `if/else` chains.
- Keep services free of HTTP concerns (`Request`, status codes); they throw domain exceptions (handled by the exception filter).
- Keep pure logic (scoring, route fitting, distance) in pure functions or small classes so it is trivially unit-testable.

## Control over everything

- Every environment variable is read and validated in one place (`common/env.ts` + `ConfigService`). Missing config fails at boot.
- Every endpoint is explicit about access: global JWT guard plus `@Roles(...)` / a public decorator. No endpoint is accidentally open.
- Every request body and query has a DTO (in `handlers/dto/`) with a whitelist. Unknown fields are stripped or rejected. Never trust input from the frontend or the fetcher.
- Return plain response shapes (not raw entities when they contain internal fields).
- External calls (APIs, AI providers) go through one service per integration so they can be mocked, rate limited and logged.

## Database: schema is owned by NestJS

- The **entities define the schema**. Nobody edits tables by hand and no other service creates or alters tables.
- **No migrations.** This is an MVP with no production data. TypeORM `synchronize: true` builds the schema from the entities on startup. If the schema changes in a way that breaks existing local data, reset the `pgdata` volume. (Revisit before any real deployment.)
- Each slice registers its entities with `TypeOrmModule.forFeature([...])`. `autoLoadEntities` is on.
- Details of the data model (document style on Postgres) are in `database.md`.

## Validation and errors

- DTOs (`handlers/dto/`) use `class-validator` with `!` on each field; `Update…Dto` is `PartialType(Create…Dto)`. Global `ValidationPipe({ whitelist: true, transform: true })`. Every string gets a `MaxLength`.
- **Use exception filters.** Services throw framework-free domain exceptions (`extends DomainException` from `common/errors/`, with a `kind`: `invalid`, `forbidden`, `not_found`, `conflict`), one per file in the slice's `exceptions/`. A global `DomainExceptionFilter` (registered with `APP_FILTER`) maps them to HTTP status and a uniform `{ statusCode, error, message }` body. Services and controllers never build HTTP responses or throw `HttpException` for business cases.
- Add a further `@Catch()` filter in `common/errors/` when a new class of error needs its own mapping (e.g. external API failures to 502), instead of try/catch in controllers.
- Status codes: 400 invalid, 401 unauthenticated, 403 forbidden, 404 missing, 409 conflict (the filter's mapping is the single source).

## REST conventions

`GET /tasks` (200, list), `GET /tasks/:id` (200), `POST /tasks` (201), `PATCH /tasks/:id` (200), `DELETE /tasks/:id` (204). The global prefix is `/api`. Ids are UUIDs.

## Code style

- Constructor injection with `private readonly`. One `Logger` per service: `log` for state changes, `warn` for rejected requests, `debug` for noise.
- Relative imports inside `src/`, `import type` for types. Strict `tsconfig`, decorators on.
- Name time constants in SCREAMING_SNAKE_CASE with a unit comment.

## Checks

From `backend/`: `npm run lint && npm run typecheck`. Tests: see `testing.md`.
