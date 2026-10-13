import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { RoutedPath } from "../common/bus/contracts";
import { EventBus } from "../common/bus/event-bus";
import { DomainException } from "../common/errors/domain.exception";
import type { LatLng } from "../common/types/geo";
import { createTestApp } from "../common/testing/test-app";
import { PathRouterUnavailableException } from "./exceptions/path-router-unavailable.exception";
import { DirectionsModule } from "./directions.module";
import { PathRouter } from "./services/path-router";

class OutsideForTest extends DomainException {
  constructor() {
    super("invalid", "This location is outside the supported cities");
  }
}

const inWroclaw = (p: LatLng) => p.lat > 51 && p.lat < 51.3;

describe("directions slice", () => {
  let app: INestApplication;
  const route = jest.fn(async (points: LatLng[]): Promise<RoutedPath> => ({
    distanceMeters: 690,
    durationSeconds: 497,
    coordinates: points,
  }));

  beforeAll(async () => {
    app = await createTestApp({
      imports: [DirectionsModule],
      env: { GRAPHHOPPER_URL: "https://gh.test", GRAPHHOPPER_TOKEN: "t" },
      override: (b) => b.overrideProvider(PathRouter).useValue({ route }),
    });
    app.get(EventBus).respond("location.ensure-inside", ({ points }) => {
      if (!points.every(inWroclaw)) throw new OutsideForTest();
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it("finds a walking path through the given points", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/directions?point=51.1079,17.0385&point=51.1097,17.0447")
      .expect(200);
    expect(res.body).toEqual({
      distanceMeters: 690,
      durationSeconds: 497,
      coordinates: [
        { lat: 51.1079, lng: 17.0385 },
        { lat: 51.1097, lng: 17.0447 },
      ],
    });
  });

  it("answers directions.route on the bus", async () => {
    const path = await app.get(EventBus).request("directions.route", {
      points: [
        { lat: 51.1, lng: 17 },
        { lat: 51.2, lng: 17.1 },
      ],
    });
    expect(path.distanceMeters).toBe(690);
  });

  it("needs at least two well-formed points", async () => {
    await request(app.getHttpServer())
      .get("/api/directions?point=51.1079,17.0385")
      .expect(400);
    await request(app.getHttpServer())
      .get("/api/directions?point=abc&point=51.1,17")
      .expect(400);
  });

  it("rejects points outside the supported cities without routing", async () => {
    route.mockClear();
    await request(app.getHttpServer())
      .get("/api/directions?point=52.4,16.93&point=51.1,17")
      .expect(400);
    expect(route).not.toHaveBeenCalled();
  });

  it("maps a router outage to 502", async () => {
    route.mockRejectedValueOnce(new PathRouterUnavailableException());
    await request(app.getHttpServer())
      .get("/api/directions?point=51.1,17&point=51.2,17.1")
      .expect(502);
  });
});
