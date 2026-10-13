import { describe, expect, it } from "vitest";
import { listRecentRoutes, saveRecentRoute } from "./recentRoutes";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

const route = (href: string) => ({
  title: "Gotyk",
  tags: ["gothic"],
  durationMinutes: 90,
  href,
  stops: [{ id: "p1", name: "Ratusz" }],
});

describe("recent routes", () => {
  it("is empty at first and without storage", () => {
    expect(listRecentRoutes(memoryStorage())).toEqual([]);
    expect(listRecentRoutes(null)).toEqual([]);
  });

  it("lists saved routes newest first with their date", () => {
    const storage = memoryStorage();
    saveRecentRoute(
      route("/route?a"),
      storage,
      new Date("2026-10-01T10:00:00Z"),
    );
    saveRecentRoute(
      route("/route?b"),
      storage,
      new Date("2026-10-02T10:00:00Z"),
    );
    const routes = listRecentRoutes(storage);
    expect(routes.map((r) => r.href)).toEqual(["/route?b", "/route?a"]);
    expect(routes[0]?.date).toBe("2026-10-02T10:00:00.000Z");
  });

  it("replaces an older entry for the same link", () => {
    const storage = memoryStorage();
    saveRecentRoute(route("/route?a"), storage);
    saveRecentRoute(route("/route?b"), storage);
    saveRecentRoute({ ...route("/route?a"), title: "Nowa" }, storage);
    const routes = listRecentRoutes(storage);
    expect(routes.map((r) => r.title + r.href)).toEqual([
      "Nowa/route?a",
      "Gotyk/route?b",
    ]);
  });

  it("ignores damaged data", () => {
    const storage = memoryStorage();
    storage.setItem("atlas.recent-routes", "{not json");
    expect(listRecentRoutes(storage)).toEqual([]);
    storage.setItem("atlas.recent-routes", '{"a":1}');
    expect(listRecentRoutes(storage)).toEqual([]);
  });
});
