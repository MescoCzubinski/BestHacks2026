import { afterEach, describe, expect, it, vi } from "vitest";
import { findPath } from "./findPath";

afterEach(() => vi.unstubAllGlobals());

const POINTS = [
  { lat: 51.1, lng: 17.03 },
  { lat: 51.11, lng: 17.04 },
];

describe("findPath", () => {
  it("asks for a path through every point, in order", async () => {
    const path = {
      distanceMeters: 1000,
      durationSeconds: 700,
      coordinates: POINTS,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => path });
    vi.stubGlobal("fetch", fetchMock);

    expect(await findPath(POINTS)).toEqual(path);
    const url = decodeURIComponent(String(fetchMock.mock.calls[0]?.[0]));
    expect(url).toMatch(/\/paths\?point=51\.1,17\.03&point=51\.11,17\.04$/);
  });

  it.each([
    [400, "outside"],
    [404, "failed"],
    [502, "unavailable"],
  ])("maps status %i to the %s error", async (status, kind) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status }));
    await expect(findPath(POINTS)).rejects.toMatchObject({ kind });
  });

  it("reports an unreachable server", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(findPath(POINTS)).rejects.toMatchObject({
      kind: "unavailable",
    });
  });
});
