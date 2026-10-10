# Testing rules

Hackathon pace, but the backend is where correctness matters. Tests are **colocated with the code they test**.

## Backend (NestJS)

- **One test file per slice/module**, in the slice folder: `task/task.service.spec.ts` (service behaviour through the Nest `Test.createTestingModule`, repository mocked or an isolated test DB).
- **Unit tests for the main functions**: business rules, calculations, matching/scoring, parsers, anything with branches. Name the file after the unit: `<name>.spec.ts` next to it.
- **E2E only if needed** (auth flow, a critical user path, a tricky multi-slice interaction): `<slice>.e2e-spec.ts` in the slice folder, using `supertest` against the Nest app.
- Test behaviour and error cases (validation failure, not found, forbidden), not implementation details. No tests for trivial getters or plain CRUD wiring.
- Runner: Jest on a temporary `tsc` build in `backend/.test-dist` (Nest 12 is ESM-only, so Jest runs with `--experimental-vm-modules`). `npm test` compiles, runs all `*.spec.ts` and `*.e2e-spec.ts`, prints results to the console and deletes the build. `npm run test:e2e` runs only e2e.
