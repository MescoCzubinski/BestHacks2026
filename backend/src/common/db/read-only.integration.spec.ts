import { DataSource } from "typeorm";
import {
  createTestDatabase,
  describeWithDatabase,
  type TestDatabase,
} from "../testing/test-database";

describeWithDatabase("backend database role", () => {
  let db: TestDatabase;
  let backend: DataSource;

  beforeAll(async () => {
    db = await createTestDatabase();
    backend = await new DataSource({
      type: "postgres",
      url: db.backendUrl,
    }).initialize();
  });

  afterAll(async () => {
    await backend?.destroy();
    await db?.drop();
  });

  it("reads every table", async () => {
    for (const table of ["supported_cities", "places", "place_tags"]) {
      await expect(backend.query(`SELECT * FROM ${table}`)).resolves.toEqual(
        [],
      );
    }
  });

  it("cannot write data", async () => {
    await expect(
      backend.query(
        `INSERT INTO supported_cities (name, region, latitude, longitude, bbox)
         VALUES ('X', 'Y', 0, 0, '[0,0,1,1]')`,
      ),
    ).rejects.toThrow("permission denied");
  });

  it("cannot change the schema", async () => {
    await expect(backend.query("CREATE TABLE t (x int)")).rejects.toThrow(
      "permission denied",
    );
  });
});
