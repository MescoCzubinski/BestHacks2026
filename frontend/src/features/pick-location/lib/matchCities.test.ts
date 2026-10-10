import { describe, expect, it } from "vitest";
import { matchCities } from "./matchCities";

describe("matchCities", () => {
  it("suggests Poznań for a short prefix", () => {
    expect(matchCities("Poz")[0]?.name).toBe("Poznań");
  });

  it("ignores case and Polish diacritics", () => {
    expect(matchCities("lodz")[0]?.name).toBe("Łódź");
    expect(matchCities("KRAKOW")[0]?.name).toBe("Kraków");
  });

  it("lists prefix matches before names that only contain the query", () => {
    const names = matchCities("gora").map((c) => c.name);
    expect(names).toEqual(["Zielona Góra", "Jelenia Góra"]);
    expect(matchCities("gd").map((c) => c.name)).toEqual(["Gdańsk", "Gdynia"]);
  });

  it("returns nothing for an empty or unknown query", () => {
    expect(matchCities("   ")).toEqual([]);
    expect(matchCities("xyz")).toEqual([]);
  });

  it("respects the limit", () => {
    expect(matchCities("a", 3)).toHaveLength(3);
  });
});
