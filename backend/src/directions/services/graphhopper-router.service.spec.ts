import type { ConfigService } from "@nestjs/config";
import { PathNotFoundException } from "../exceptions/path-not-found.exception";
import { PathRouterUnavailableException } from "../exceptions/path-router-unavailable.exception";
import { GraphHopperPathMapper } from "./graphhopper-path-mapper.service";
import { GraphHopperRouter } from "./graphhopper-router.service";

const POINTS = [
  { lat: 51.1, lng: 17.03 },
  { lat: 51.11, lng: 17.04 },
];

const BODY = {
  paths: [
    {
      distance: 1000.4,
      time: 700_000,
      points: {
        coordinates: [
          [17.03, 51.1],
          [17.04, 51.11],
        ],
      },
    },
  ],
};

function router() {
  const config = {
    getOrThrow: (key: string) =>
      key === "GRAPHHOPPER_URL" ? "https://gh.test" : "secret",
  } as unknown as ConfigService;
  return new GraphHopperRouter(config, new GraphHopperPathMapper());
}

afterEach(() => jest.restoreAllMocks());

describe("GraphHopperRouter", () => {
  it("asks for a pedestrian path through the points with the token", async () => {
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(BODY)));
    const path = await router().route(POINTS);
    expect(path).toEqual({
      distanceMeters: 1000,
      durationSeconds: 700,
      coordinates: POINTS,
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    const u = new URL(String(url));
    expect(u.origin + u.pathname).toBe("https://gh.test/route");
    expect(u.searchParams.getAll("point")).toEqual([
      "51.1,17.03",
      "51.11,17.04",
    ]);
    expect(u.searchParams.get("profile")).toBe("safe_pedestrian");
    expect(init?.headers).toEqual({ Authorization: "Bearer secret" });
  });

  it("reports a 400 or an empty answer as no path", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("{}", { status: 400 }))
      .mockResolvedValueOnce(new Response("{}"));
    await expect(router().route(POINTS)).rejects.toThrow(PathNotFoundException);
    await expect(router().route(POINTS)).rejects.toThrow(PathNotFoundException);
  });

  it("reports server errors and network failures as unavailable", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockRejectedValueOnce(new TypeError("offline"));
    await expect(router().route(POINTS)).rejects.toThrow(
      PathRouterUnavailableException,
    );
    await expect(router().route(POINTS)).rejects.toThrow(
      PathRouterUnavailableException,
    );
  });
});
