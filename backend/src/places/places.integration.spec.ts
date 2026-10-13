import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { EventBus } from "../common/bus/event-bus";
import { DomainException } from "../common/errors/domain.exception";
import type { LatLng } from "./services/geo";
import { createTestApp } from "../common/testing/test-app";
import {
  createTestDatabase,
  describeWithDatabase,
  type TestDatabase,
} from "../common/testing/test-database";
import { PlacesModule } from "./places.module";
import { PlaceService } from "./services/place.service";

class OutsideForTest extends DomainException {
  constructor() {
    super("invalid", "This location is outside the supported cities");
  }
}

const START = { lat: 51.11, lng: 17.03 };

const PLAN = {
  start: START,
  durationMinutes: 90,
  wheelchair: false,
  tags: ["gothic"],
  startTime: "2026-10-12T08:00:00Z",
};

describeWithDatabase("places slice", () => {
  let db: TestDatabase;
  let app: INestApplication;
  const inWroclaw = (p: LatLng) => p.lat > 51 && p.lat < 51.3;

  beforeAll(async () => {
    db = await createTestDatabase();
    await db.query(
      `INSERT INTO places (external_id, name, latitude, longitude, address, significance, facts)
       VALUES ('wroclaw:t:1', 'Muzeum Narodowe', 51.11, 17.047, '{}', 0, '{"wheelchair": "yes"}'),
              ('wroclaw:t:2', 'Ratusz', 51.11, 17.032, '{}', 90, '{}'),
              ('wroclaw:t:3', 'Daleki zamek', 52.4, 16.9, '{}', 100, '{}')`,
    );
    await db.query(
      `INSERT INTO place_tags (place_id, tag, percent)
       SELECT id, 'museum'::style_tag, 90 FROM places WHERE external_id = 'wroclaw:t:1'
       UNION ALL SELECT id, 'gothic', 95 FROM places WHERE external_id = 'wroclaw:t:2'
       UNION ALL SELECT id, 'gothic', 99 FROM places WHERE external_id = 'wroclaw:t:3'`,
    );

    app = await createTestApp({
      imports: [PlacesModule],
      databaseUrl: db.backendUrl,
    });
    const bus = app.get(EventBus);
    bus.respond("location.ensure-inside", ({ points }) => {
      if (!points.every(inWroclaw)) throw new OutsideForTest();
    });
    bus.respond("directions.route", ({ points }) => ({
      distanceMeters: 500 * (points.length - 1),
      durationSeconds: 360 * (points.length - 1),
      coordinates: points,
    }));
  });

  afterAll(async () => {
    await app?.close();
    await db?.drop();
  });

  it("searches places by name with visit time and entry flag", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/places")
      .query({ query: "muzeum" })
      .expect(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        name: "Muzeum Narodowe",
        visitMinutes: 45,
        enterable: true,
      }),
    ]);
  });

  it("rejects a query that is too short", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/places")
      .query({ query: "m" })
      .expect(400);
    expect(res.body.statusCode).toBe(400);
  });

  it("finds candidates inside the box only", async () => {
    const candidates = await app.get(PlaceService).findCandidates({
      south: 51,
      west: 16.9,
      north: 51.2,
      east: 17.1,
      tags: ["gothic", "museum"],
      minPercent: 50,
      limit: 10,
    });
    expect(candidates.map((c) => c.name)).toEqual([
      "Ratusz",
      "Muzeum Narodowe",
    ]);
    expect(candidates[1]).toMatchObject({
      wheelchair: "yes",
      tags: { museum: 90 },
    });
  });

  it("plans a round trip through the matching places", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/places/plan")
      .send(PLAN)
      .expect(201);
    expect(res.body.stops.map((s: { name: string }) => s.name)).toEqual([
      "Ratusz",
    ]);
    expect(res.body.path.coordinates[0]).toEqual(START);
    expect(res.body.path.coordinates.at(-1)).toEqual(START);
  });

  it("rejects unknown tags and fields in a plan", async () => {
    await request(app.getHttpServer())
      .post("/api/places/plan")
      .send({ ...PLAN, tags: ["not_a_tag"] })
      .expect(400);
    await request(app.getHttpServer())
      .post("/api/places/plan")
      .send({ ...PLAN, userId: "x" })
      .expect(400);
  });

  it("refuses a plan starting outside the supported cities", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/places/plan")
      .send({ ...PLAN, start: { lat: 52.4, lng: 16.93 } })
      .expect(400);
    expect(res.body.error).toBe("invalid");
  });

  it("reports 404 when no place matches the tags", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/places/plan")
      .send({ ...PLAN, tags: ["baroque"] })
      .expect(404);
    expect(res.body.error).toBe("not_found");
  });

  it("reports 400 when the direct walk alone is longer than the budget", async () => {
    await request(app.getHttpServer())
      .post("/api/places/plan")
      .send({ ...PLAN, end: { lat: 51.25, lng: 17.2 }, durationMinutes: 15 })
      .expect(400);
  });
});
