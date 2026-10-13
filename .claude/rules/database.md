---
paths:
  - "backend/**"
  - "fetcher/**"
  - "db/**"
---

# Database rules (PostgreSQL as a document store, schema defined in db/)

- PostgreSQL 17 only. The data model is **document-oriented**: one table per aggregate (the thing a user thinks of as one "document"), with nested data stored as `jsonb` instead of many join tables.
- **`db/init/*.sql` owns the schema and the roles.** Postgres applies it on the first start of the `pgdata` volume. No migrations (MVP, no production data): a schema change means editing the SQL (and the backend entity), then resetting the volume. Nothing creates or alters tables at runtime; `synchronize` is off.
- **Three roles:**
  - the owner: runs `db/init`, used by nobody at runtime;
  - `backend_ro`: `SELECT` only, the backend's `DATABASE_URL`;
  - `fetcher_rw`: `INSERT/UPDATE/DELETE` on data tables, no DDL, the fetcher's URL.
- **Only the fetcher writes data; the backend only reads.** This is enforced by role permissions, not by convention. Reference rows (e.g. the city/region) are written by the fetcher too.

## Entity shape (backend: a read mapping of a table defined in db/init)

```ts
@Entity("places")
export class Place {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @Column("text", { name: "external_id" }) externalId!: string; // anything you filter, join or sort by = real column
  @Column("jsonb") facts!: PlaceFacts; // the document body, typed in TS
  @Column("timestamptz", { name: "updated_at" }) updatedAt!: Date;
}
```

- Real columns for: id, foreign keys, status/type enums, timestamps, anything queried often or needing a unique constraint.
- `jsonb` for: flexible or nested content, lists that belong to the parent, data that is always read and written together with its parent.
- The document type has a TypeScript `type`/class in the slice. The fetcher writes exactly that shape; the jsonb column is never "anything goes".
- Add a GIN index (in `db/init`) only when you actually query inside the jsonb (`@>`, `->>`).
- Cross-slice references are plain uuid columns (no TypeORM relations across slices) so slices stay independent.
- Raw SQL only for jsonb queries TypeORM cannot express, and always parameterized.

## Repositories and data

- A backend repository serves a **business object**, not a table, and only **reads** (`findNearby`, `findByTags`), even when that touches several tables or a jsonb document.
- **The backend has no seed.** Demo and real data come only from the fetcher. Data comes from public sources or is fictional; never real personal data.
- Connection strings come from `DATABASE_URL` (backend, `backend_ro`) and the fetcher's own `.env` (`fetcher_rw`). Docker Compose provides the `db` service with the `pgdata` volume and mounts `db/init` into `/docker-entrypoint-initdb.d`.
