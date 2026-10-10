import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoute, type RouteRequest } from "./createRoute";

afterEach(() => vi.unstubAllGlobals());

const REQUEST: RouteRequest = {
  start: { lat: 51.1, lng: 17.03 },
  durationMinutes: 90,
  wheelchair: false,
  tags: ["art_nouveau"],
};

describe("createRoute", () => {
  it("posts the request and returns the built route", async () => {
    const route = {
      stops: [],
      path: { distanceMeters: 1, durationSeconds: 1, coordinates: [] },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 201, json: async () => route });
    vi.stubGlobal("fetch", fetchMock);

    expect(await createRoute(REQUEST)).toEqual(route);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toMatch(/\/routes$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(REQUEST);
  });

  it.each([
    [400, "outside"],
    [404, "failed"],
    [502, "unavailable"],
  ])("maps status %i to the %s error", async (status, kind) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status }));
    await expect(createRoute(REQUEST)).rejects.toMatchObject({ kind });
  });

  it("reports an unreachable server", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(createRoute(REQUEST)).rejects.toMatchObject({
      kind: "unavailable",
    });
  });
});
