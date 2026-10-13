---
paths:
  - "backend/**"
  - "fetcher/**"
---

# Database rules (PostgreSQL as a document store, schema owned by the fetcher)

- PostgreSQL 17 only. The data model is **document-oriented**: one table per aggregate (the thing a user thinks of as one "document"), with nested data stored as `jsonb` instead of many join tables.
- **`fetcher/app/schema.sql` owns the schema.** The fetcher applies it at the start of every run, so every statement is idempotent (`IF NOT EXISTS`, the enum in a `DO` block). No migrations (MVP): it only creates what is missing, so changing an existing table or adding an enum value needs a manual `ALTER` (in dev, reset the `pgdata` volume). The backend never creates or alters tables; `synchronize` is off.
- **The database, its roles and grants come from Kubernetes**, not from the repo. In the cluster the fetcher's user needs DDL on the schema; the backend's user needs only `SELECT`. Locally (Docker Compose) both connect as the one dev user `app`.
- **Only the fetcher writes data; the backend only reads.** Reference rows (e.g. the city/region) are written by the fetcher too.

## Entity shape (backend: a read mapping of a table defined in fetcher/app/schema.sql)

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
- Add a GIN index (in `fetcher/app/schema.sql`) only when you actually query inside the jsonb (`@>`, `->>`).
- Cross-slice references are plain uuid columns (no TypeORM relations across slices) so slices stay independent.
- Raw SQL only for jsonb queries TypeORM cannot express, and always parameterized.

## Repositories and data

- A backend repository serves a **business object**, not a table, and only **reads** (`findNearby`, `findByTags`), even when that touches several tables or a jsonb document.
- **The backend has no seed.** Demo and real data come only from the fetcher. Data comes from public sources or is fictional; never real personal data.
- Connection strings come from `DATABASE_URL` (backend) and the fetcher's own `.env` (`DB_URL`). Docker Compose provides a dev-only `db` service with the `pgdata` volume.
