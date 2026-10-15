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
import { OutsideSupportedAreaException } from "./exceptions/outside-supported-area.exception";
import { LocationModule } from "./location.module";
import { PhotonClient, type GeocodedLocation } from "./services/photon.client";

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

describeWithDatabase("location slice", () => {
  let db: TestDatabase;
  let app: INestApplication;
  const geocoder = { search: jest.fn(), reverse: jest.fn() };

  beforeAll(async () => {
    db = await createTestDatabase();
    await db.query(
      `INSERT INTO supported_cities (name, region, latitude, longitude, bbox)
       VALUES ('Wrocław', 'dolnośląskie', 51.1, 17.03, '[16.8, 51.04, 17.18, 51.21]'),
              ('Kraków', 'małopolskie', 50.06, 19.94, '[19.8, 49.95, 20.1, 50.15]')`,
    );
    app = await createTestApp({
      imports: [LocationModule],
      databaseUrl: db.backendUrl,
      override: (b) => b.overrideProvider(PhotonClient).useValue(geocoder),
    });
  });

  afterAll(async () => {
    await app?.close();
    await db?.drop();
  });

  it("searches addresses inside each supported city", async () => {
    geocoder.search.mockImplementation(async (query: string) =>
      query.endsWith("Wrocław") ? [PARKOWA] : [],
    );
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

  it("reverse-geocodes a point and says whether its city is supported", async () => {
    geocoder.reverse.mockResolvedValueOnce(PARKOWA);
    const res = await request(app.getHttpServer())
      .get("/api/locations/reverse")
      .query({ lat: 51.11, lng: 17.03 })
      .expect(200);
    expect(res.body).toEqual({
      location: PARKOWA,
      supported: true,
      supportedCities: ["Kraków", "Wrocław"],
    });
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

  it("rejects location.ensure-inside for a point outside every city", async () => {
    await expect(
      app.get(EventBus).request("location.ensure-inside", {
        points: [
          { lat: 51.11, lng: 17.03 },
          { lat: 52.4, lng: 16.93 },
        ],
      }),
    ).rejects.toThrow(OutsideSupportedAreaException);
  });
});
