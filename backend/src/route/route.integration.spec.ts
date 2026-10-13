import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { PlaceCandidate } from "../common/bus/contracts";
import { EventBus } from "../common/bus/event-bus";
import { DomainException } from "../common/errors/domain.exception";
import type { LatLng } from "../common/types/geo";
import { createTestApp } from "../common/testing/test-app";
import { RouteModule } from "./route.module";

class OutsideForTest extends DomainException {
  constructor() {
    super("invalid", "This location is outside the supported cities");
  }
}

const START = { lat: 51.11, lng: 17.03 };

const candidate = (
  id: string,
  lat: number,
  lng: number,
  visitMinutes: number,
): PlaceCandidate => ({
  id,
  name: `Place ${id}`,
  latitude: lat,
  longitude: lng,
  description: null,
  mainImageUrl: null,
  significance: 50,
  tags: { gothic: 90 },
  wheelchair: null,
  openingHours: null,
  visitMinutes,
  enterable: false,
});

const BODY = {
  start: START,
  durationMinutes: 90,
  wheelchair: false,
  tags: ["gothic"],
  startTime: "2026-10-12T08:00:00Z",
};

describe("route slice", () => {
  let app: INestApplication;
  let places: PlaceCandidate[];
  const inWroclaw = (p: LatLng) => p.lat > 51 && p.lat < 51.3;

  beforeAll(async () => {
    app = await createTestApp({ imports: [RouteModule] });
    const bus = app.get(EventBus);
    bus.respond("city.ensure-inside", ({ points }) => {
      if (!points.every(inWroclaw)) throw new OutsideForTest();
    });
    bus.respond("place.candidates", () => places);
    bus.respond("path.route", ({ points }) => ({
      distanceMeters: 500 * (points.length - 1),
      durationSeconds: 360 * (points.length - 1),
      coordinates: points,
    }));
  });

  beforeEach(() => {
    places = [
      candidate("a", 51.112, 17.032, 15),
      candidate("b", 51.113, 17.035, 15),
    ];
  });

  afterAll(async () => {
    await app?.close();
  });

  it("builds a round trip through the matching places", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/routes")
      .send(BODY)
      .expect(201);
    expect(res.body.stops.map((s: { id: string }) => s.id).sort()).toEqual([
      "a",
      "b",
    ]);
    expect(res.body.extras).toEqual([]);
    expect(res.body.path.coordinates[0]).toEqual(START);
    expect(res.body.path.coordinates.at(-1)).toEqual(START);
  });

  it("rejects unknown tags and fields", async () => {
    await request(app.getHttpServer())
      .post("/api/routes")
      .send({ ...BODY, tags: ["not_a_tag"] })
      .expect(400);
    await request(app.getHttpServer())
      .post("/api/routes")
      .send({ ...BODY, userId: "x" })
      .expect(400);
  });

  it("refuses a start outside the supported cities", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/routes")
      .send({ ...BODY, start: { lat: 52.4, lng: 16.93 } })
      .expect(400);
    expect(res.body.error).toBe("invalid");
  });

  it("reports 404 when no place matches", async () => {
    places = [];
    const res = await request(app.getHttpServer())
      .post("/api/routes")
      .send(BODY)
      .expect(404);
    expect(res.body.error).toBe("not_found");
  });

  it("reports 400 when the direct walk alone is longer than the budget", async () => {
    await request(app.getHttpServer())
      .post("/api/routes")
      .send({ ...BODY, end: { lat: 51.25, lng: 17.2 }, durationMinutes: 15 })
      .expect(400);
  });
});
