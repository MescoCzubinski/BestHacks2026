import { validateEnv } from "./env";

const valid = {
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  GRAPHHOPPER_URL: "https://graphhopper.example",
  GRAPHHOPPER_TOKEN: "token",
  EMBEDDING_MODEL: "Xenova/some-model",
};

describe("validateEnv", () => {
  it("returns the env when everything required is set", () => {
    expect(validateEnv(valid)).toBe(valid);
  });

  it("lists every missing variable", () => {
    expect(() => validateEnv({})).toThrow(
      "DATABASE_URL, GRAPHHOPPER_URL, GRAPHHOPPER_TOKEN, EMBEDDING_MODEL",
    );
  });
});
