import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "../common/testing/test-app";
import {
  createTestDatabase,
  describeWithDatabase,
  type TestDatabase,
} from "../common/testing/test-database";
import { HealthModule } from "./health.module";

describeWithDatabase("health slice", () => {
  let db: TestDatabase;
  let app: INestApplication;

  beforeAll(async () => {
    db = await createTestDatabase();
    app = await createTestApp({
      imports: [HealthModule],
      databaseUrl: db.backendUrl,
    });
  });

  afterAll(async () => {
    await app?.close();
    await db?.drop();
  });

  it("reports the database as up", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/health")
      .expect(200);
    expect(res.body.info.database.status).toBe("up");
  });
});
