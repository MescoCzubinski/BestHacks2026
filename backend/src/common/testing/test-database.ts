import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

const SCHEMA_FILE = resolve(
  process.cwd(),
  "..",
  "fetcher",
  "app",
  "schema.sql",
);

export type TestDatabase = {
  backendUrl: string;
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>;
  drop: () => Promise<void>;
};

export const describeWithDatabase = TEST_DATABASE_URL
  ? describe
  : describe.skip;

async function withClient<T>(
  url: string,
  run: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const adminUrl = TEST_DATABASE_URL;
  if (!adminUrl) throw new Error("TEST_DATABASE_URL is not set");
  const name = `atlas_test_${randomBytes(6).toString("hex")}`;

  await withClient(adminUrl, (admin) => admin.query(`CREATE DATABASE ${name}`));

  const ownerUrl = new URL(adminUrl);
  ownerUrl.pathname = `/${name}`;
  await withClient(ownerUrl.toString(), async (owner) => {
    await owner.query(readFileSync(SCHEMA_FILE, "utf-8"));
  });

  const owner = new Client({ connectionString: ownerUrl.toString() });
  await owner.connect();

  return {
    backendUrl: ownerUrl.toString(),
    query: async (sql, params) => (await owner.query(sql, params)).rows,
    drop: async () => {
      await owner.end();
      await withClient(adminUrl, (admin) =>
        admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`),
      );
    },
  };
}
