import type { INestApplication } from "@nestjs/common";
import { EventBus } from "../common/bus/event-bus";
import { createTestApp } from "../common/testing/test-app";
import {
  createTestDatabase,
  describeWithDatabase,
  type TestDatabase,
} from "../common/testing/test-database";
import { CityModule } from "./city.module";
import { OutsideSupportedAreaException } from "./exceptions/outside-supported-area.exception";

describeWithDatabase("city slice", () => {
  let db: TestDatabase;
  let app: INestApplication;
  let bus: EventBus;

  beforeAll(async () => {
    db = await createTestDatabase();
    await db.query(
      `INSERT INTO supported_cities (name, region, latitude, longitude, bbox)
       VALUES ('Wrocław', 'dolnośląskie', 51.1, 17.03, '[16.8, 51.04, 17.18, 51.21]'),
              ('Kraków', 'małopolskie', 50.06, 19.94, '[19.8, 49.95, 20.1, 50.15]')`,
    );
    app = await createTestApp({
      imports: [CityModule],
      databaseUrl: db.backendUrl,
    });
    bus = app.get(EventBus);
  });

  afterAll(async () => {
    await app?.close();
    await db?.drop();
  });

  it("answers city.supported from the database, ordered by name", async () => {
    expect(await bus.request("city.supported", {})).toEqual([
      { name: "Kraków", bbox: [19.8, 49.95, 20.1, 50.15] },
      { name: "Wrocław", bbox: [16.8, 51.04, 17.18, 51.21] },
    ]);
  });

  it("answers city.support-at", async () => {
    expect(
      await bus.request("city.support-at", { lat: 51.11, lng: 17.03 }),
    ).toEqual({ supported: true, supportedCities: ["Kraków", "Wrocław"] });
  });

  it("rejects city.ensure-inside for a point outside every city", async () => {
    await expect(
      bus.request("city.ensure-inside", {
        points: [
          { lat: 51.11, lng: 17.03 },
          { lat: 52.4, lng: 16.93 },
        ],
      }),
    ).rejects.toThrow(OutsideSupportedAreaException);
  });
});
