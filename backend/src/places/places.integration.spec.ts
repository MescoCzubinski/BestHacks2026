import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { EventBus } from "../common/bus/event-bus";
import { createTestApp } from "../common/testing/test-app";
import {
  createTestDatabase,
  describeWithDatabase,
  type TestDatabase,
} from "../common/testing/test-database";
import { GeocoderUnavailableException } from "./exceptions/geocoder-unavailable.exception";
import { PlacesModule } from "./places.module";
import { Geocoder, type GeocodedLocation } from "./services/geocoder";

const WROCLAW_BBOX: [number, number, number, number] = [
  16.8, 51.04, 17.18, 51.21,
];

const PARKOWA: GeocodedLocation = {
  label: "Parkowa 1-3, 51-616 Wrocław",
  street: "Parkowa",
  houseNumber: "1-3",
  postalCode: "51-616",
  city: "Wrocław",
  lat: 51.1096,
  lng: 17.0744,
};

describeWithDatabase("places slice", () => {
  let db: TestDatabase;
  let app: INestApplication;
  const geocoder = { search: jest.fn(), reverse: jest.fn() };

  beforeAll(async () => {
    db = await createTestDatabase();
    const [museum] = (await db.query(
      `INSERT INTO places (external_id, name, latitude, longitude, address, significance, facts)
       VALUES ('wroclaw:t:1', 'Muzeum Narodowe', 51.11, 17.047, '{}', 0, '{"wheelchair": "yes"}'),
              ('wroclaw:t:2', 'Ratusz', 51.11, 17.032, '{}', 90, '{}'),
              ('wroclaw:t:3', 'Daleki zamek', 52.4, 16.9, '{}', 100, '{}')
       RETURNING id`,
    )) as { id: string }[];
    await db.query(
      `INSERT INTO place_tags (place_id, tag, percent)
       SELECT id, 'museum'::style_tag, 90 FROM places WHERE external_id = 'wroclaw:t:1'
       UNION ALL SELECT id, 'gothic', 95 FROM places WHERE external_id = 'wroclaw:t:2'
       UNION ALL SELECT id, 'gothic', 99 FROM places WHERE external_id = 'wroclaw:t:3'`,
    );
    expect(museum?.id).toBeDefined();

    app = await createTestApp({
      imports: [PlacesModule],
      databaseUrl: db.backendUrl,
      override: (b) => b.overrideProvider(Geocoder).useValue(geocoder),
    });
    const bus = app.get(EventBus);
    bus.respond("city.supported", () => [
      { name: "Wrocław", bbox: WROCLAW_BBOX },
    ]);
    bus.respond("city.support-at", () => ({
      supported: true,
      supportedCities: ["Wrocław"],
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

  it("answers place.candidates inside the box only", async () => {
    const candidates = await app.get(EventBus).request("place.candidates", {
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

  it("searches addresses inside the supported cities", async () => {
    geocoder.search.mockResolvedValueOnce([PARKOWA]);
    const res = await request(app.getHttpServer())
      .get("/api/locations")
      .query({ query: "Parkowa 3" })
      .expect(200);
    expect(res.body).toEqual([PARKOWA]);
    expect(geocoder.search).toHaveBeenCalledWith(
      "Parkowa 3 Wrocław",
      WROCLAW_BBOX,
      6,
    );
  });

  it("maps a geocoder outage to 502", async () => {
    geocoder.reverse.mockRejectedValueOnce(new GeocoderUnavailableException());
    const res = await request(app.getHttpServer())
      .get("/api/locations/reverse")
      .query({ lat: 51.1, lng: 17.07 })
      .expect(502);
    expect(res.body).toEqual({
      statusCode: 502,
      error: "unavailable",
      message: "Address search is temporarily unavailable",
    });
  });

  it("reports a point without an address as not found", async () => {
    geocoder.reverse.mockResolvedValueOnce(null);
    await request(app.getHttpServer())
      .get("/api/locations/reverse")
      .query({ lat: 51.1, lng: 17.07 })
      .expect(404);
  });
});
