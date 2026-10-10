---
paths:
  - "backend/**"
  - "fetcher/**"
  - "db/**"
---

# Database rules (PostgreSQL as a document store, schema defined by Nest)

- PostgreSQL 17 only. The data model is **document-oriented**: one table per aggregate (the thing a user thinks of as one "document"), with nested data stored as `jsonb` instead of many join tables.
- **NestJS owns the schema.** The TypeORM entity is the only definition of a table. Python or any other service writes only to tables the backend defined and never runs DDL.

## Entity shape

```ts
@Entity("tasks")
export class Task {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @Column({ type: "uuid" }) ownerId!: string; // anything you filter, join or sort by = real column
  @Column({ type: "jsonb" }) data!: TaskData; // the document body, typed in TS
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
```

- Real columns for: id, foreign keys, status/type enums, timestamps, anything queried often or needing a unique constraint.
- `jsonb` for: flexible or nested content, lists that belong to the parent, data that is always read and written together with its parent.
- Give the document type a TypeScript `type`/class in the slice and validate its shape with a DTO before saving. The jsonb column is never "anything goes".
- Add a GIN index (`@Index({ using: "gin" })` on the jsonb column) only when you actually query inside the jsonb (`@>`, `->>`).
- Cross-slice references are plain uuid columns (no TypeORM relations across slices) so slices stay independent.
- Raw SQL only for jsonb queries TypeORM cannot express, and always parameterized.

## Repositories and seed data

- A repository serves a **business object**, not a table. `TaskRepository` exposes what the domain needs (`findOpenForUser`, `save(task)`), even when that touches several tables or a jsonb document. It is optional: use `Repository<T>` directly in a service until queries justify one.
- **No per-slice seed files.** Demo/seed data lives in one shared place, `backend/src/common/db/seed/`, run once on startup by a `SeedService` (idempotent upsert by id, only outside production). It may write several entities at once, so relations between demo objects stay consistent.
- Demo data comes from public sources or is fictional; never real personal data.
- Connection string comes from `DATABASE_URL`. Docker Compose provides the `db` service with the `pgdata` volume.
