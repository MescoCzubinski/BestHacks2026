import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { STYLE_TAGS } from "./style-tag";

const SCHEMA = resolve(process.cwd(), "..", "db", "init", "01-schema.sql");

describe("STYLE_TAGS", () => {
  it("matches the style_tag enum in db/init", () => {
    const sql = readFileSync(SCHEMA, "utf-8");
    const body = /CREATE TYPE style_tag AS ENUM \(([^)]*)\)/.exec(sql)?.[1];
    const values = [...(body ?? "").matchAll(/'(\w+)'/g)].map((m) => m[1]);
    expect(values).toEqual([...STYLE_TAGS]);
  });
});
