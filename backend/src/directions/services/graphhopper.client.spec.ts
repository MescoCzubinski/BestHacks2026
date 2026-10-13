import type { ConfigService } from "@nestjs/config";
import { PathNotFoundException } from "../exceptions/path-not-found.exception";
import { PathRouterUnavailableException } from "../exceptions/path-router-unavailable.exception";
import { GraphHopperClient, toRoutedPath } from "./graphhopper.client";

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
  return new GraphHopperClient(config);
}

afterEach(() => jest.restoreAllMocks());

describe("GraphHopperClient", () => {
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

describe("toRoutedPath", () => {
  it("converts distance, time and [lon, lat] points", () => {
    expect(
      toRoutedPath({
        paths: [
          {
            distance: 1263.114,
            time: 909440,
            points: {
              coordinates: [
                [17.921292, 50.675153],
                [17.923095, 50.675255],
              ],
            },
          },
        ],
      }),
    ).toEqual({
      distanceMeters: 1263,
      durationSeconds: 909,
      coordinates: [
        { lat: 50.675153, lng: 17.921292 },
        { lat: 50.675255, lng: 17.923095 },
      ],
    });
  });

  it("returns null when there is no usable path", () => {
    expect(toRoutedPath({})).toBeNull();
    expect(toRoutedPath({ paths: [] })).toBeNull();
    expect(
      toRoutedPath({
        paths: [{ distance: 1, time: 1, points: { coordinates: [] } }],
      }),
    ).toBeNull();
  });
});
