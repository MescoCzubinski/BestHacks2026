import type { ConfigService } from "@nestjs/config";
import type { RoutedPath } from "../../common/bus/contracts";
import type { EventBus } from "../../common/bus/event-bus";
import { DomainException } from "../../common/errors/domain.exception";
import { NoMatchingPlacesException } from "../exceptions/no-matching-places.exception";
import { TimeBudgetTooSmallException } from "../exceptions/time-budget-too-small.exception";
import type { PlaceService } from "./place.service";
import { PlanService, walkMinutes } from "./plan.service";
import type { PlaceCandidate, PlannedStop, RouteQuery } from "./types";

const START = { lat: 51.11, lng: 17.03 };
const START_TIME = new Date("2026-10-12T08:00:00Z");

function place(
  id: string,
  lat: number,
  lng: number,
  tags: PlaceCandidate["tags"],
  visitMinutes: number,
  enterable = false,
  extra: Partial<PlaceCandidate> = {},
): PlaceCandidate {
  return {
    id,
    name: `Place ${id}`,
    latitude: lat,
    longitude: lng,
    description: id === "museum" ? "A museum" : null,
    mainImageUrl: `https://img/${id}.jpg`,
    significance: 50,
    tags,
    openingHours: null,
    visitMinutes,
    enterable,
    ...extra,
  };
}

const PLACES: PlaceCandidate[] = [
  place("museum", 51.112, 17.032, { museum: 90, gothic: 60 }, 65, true, {
    significance: 90,
  }),
  place("church", 51.113, 17.035, { church: 80, gothic: 95 }, 20, true, {
    significance: 70,
  }),
  place("closed", 51.111, 17.031, { gothic: 99 }, 12, false, {
    significance: 100,
    openingHours: "Mo-Su 20:00-22:00",
  }),
  place("far", 51.2, 17.2, { gothic: 99 }, 12, false, { significance: 100 }),
  place("mural", 51.108, 17.034, { mural: 90 }, 3, false, {
    significance: 20,
  }),
  place("tower", 51.114, 17.028, { tower: 85, gothic: 75 }, 20, true, {
    significance: 60,
  }),
];

function stop(
  id: string,
  visitMinutes: number,
  enterable: boolean,
  arriveAt?: string,
) {
  const p = PLACES.find((x) => x.id === id)!;
  return {
    id,
    name: p.name,
    description: p.description ?? "",
    lat: p.latitude,
    lng: p.longitude,
    visitMinutes,
    enterable,
    arriveAt,
    imageUrl: p.mainImageUrl,
  };
}

const QUERY: RouteQuery = {
  start: START,
  end: START,
  durationMinutes: 120,
  tags: ["gothic"],
  startTime: START_TIME,
};

class Outside extends DomainException {
  constructor() {
    super("invalid", "outside");
  }
}

function setup(
  walkSecondsPerLeg = 300,
  found: PlaceCandidate[] = PLACES,
  inside = true,
) {
  const findCandidates = jest.fn(async (_query: unknown) => found);
  const route = jest.fn(async (points: unknown[]): Promise<RoutedPath> => ({
    distanceMeters: 1000,
    durationSeconds: (points.length - 1) * walkSecondsPerLeg,
    coordinates: [],
  }));
  const request = jest.fn(
    async (name: string, payload: { points: unknown[] }) => {
      if (name === "location.ensure-inside") {
        if (!inside) throw new Outside();
        return undefined;
      }
      return route(payload.points);
    },
  );
  const service = new PlanService(
    { request } as unknown as EventBus,
    { findCandidates } as unknown as PlaceService,
    { get: () => "Europe/Warsaw" } as unknown as ConfigService,
  );
  return { service, route, request, findCandidates };
}

describe("PlanService.plan (characterization)", () => {
  it("plans the current stops, order, timing and extras", async () => {
    const { service, findCandidates } = setup();
    const route = await service.plan(QUERY);
    expect(findCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ["gothic"], minPercent: 50, limit: 600 }),
    );
    expect(route).toEqual({
      stops: [
        stop("tower", 20, true, "2026-10-12T08:08:04.824Z"),
        stop("church", 20, true, "2026-10-12T08:36:46.003Z"),
      ],
      extras: [stop("closed", 12, false), stop("museum", 65, true)],
    });
  });

  it("drops stops while the real walk overshoots the budget", async () => {
    const { service, route } = setup(2000);
    const planned = await service.plan(QUERY);
    expect(route.mock.calls.length).toBeGreaterThan(1);
    expect(planned).toEqual({
      stops: [stop("church", 20, true, "2026-10-12T08:08:22.128Z")],
      extras: [
        stop("closed", 12, false),
        stop("tower", 20, true),
        stop("museum", 65, true),
      ],
    });
  });

  it("refuses a budget shorter than the direct walk", async () => {
    const { service } = setup();
    await expect(
      service.plan({
        ...QUERY,
        end: { lat: 51.2, lng: 17.2 },
        durationMinutes: 15,
      }),
    ).rejects.toThrow(TimeBudgetTooSmallException);
  });

  it("reports no matching places for tags nothing carries", async () => {
    const { service } = setup();
    await expect(service.plan({ ...QUERY, tags: [] })).rejects.toThrow(
      NoMatchingPlacesException,
    );
  });
});

describe("PlanService.build", () => {
  const STOPS: PlannedStop[] = [
    {
      id: "a",
      name: "A",
      description: "",
      lat: 51.11,
      lng: 17.032,
      visitMinutes: 20,
      enterable: false,
    },
    {
      id: "b",
      name: "B",
      description: "",
      lat: 51.112,
      lng: 17.045,
      visitMinutes: 30,
      enterable: false,
    },
  ];
  const END = { lat: 51.105, lng: 17.04 };
  const QUERY_TO_END: RouteQuery = { ...QUERY, end: END };

  it("walks from the start through the planned stops to the end", async () => {
    const { service, request, route } = setup();
    const plan = jest
      .spyOn(service, "plan")
      .mockResolvedValue({ stops: STOPS, extras: [] });
    const built = await service.build(QUERY_TO_END);
    expect(request).toHaveBeenCalledWith("location.ensure-inside", {
      points: [START, END],
    });
    expect(plan).toHaveBeenCalledWith(QUERY_TO_END);
    expect(route).toHaveBeenCalledWith([
      START,
      { lat: 51.11, lng: 17.032 },
      { lat: 51.112, lng: 17.045 },
      END,
    ]);
    expect(built).toEqual({
      stops: STOPS,
      extras: [],
      path: { distanceMeters: 1000, durationSeconds: 900, coordinates: [] },
    });
  });

  it("refuses a start or end outside the supported cities before planning", async () => {
    const { service, route, findCandidates } = setup(300, PLACES, false);
    await expect(service.build(QUERY)).rejects.toThrow(Outside);
    expect(findCandidates).not.toHaveBeenCalled();
    expect(route).not.toHaveBeenCalled();
  });
});

describe("PlanService.selectCandidates", () => {
  const SHORT: RouteQuery = {
    start: START,
    end: START,
    durationMinutes: 60,
    tags: ["gothic", "museum"],
  };
  const near = (
    id: string,
    over: Partial<PlaceCandidate> = {},
  ): PlaceCandidate => ({
    id,
    name: id,
    latitude: 51.112,
    longitude: 17.032,
    description: null,
    mainImageUrl: null,
    significance: 0,
    tags: { gothic: 80 },
    openingHours: null,
    visitMinutes: 10,
    enterable: false,
    ...over,
  });

  it("asks for candidates in a box the walk can reach", async () => {
    const { service, findCandidates } = setup(300, []);
    await service.selectCandidates(SHORT);
    const query = findCandidates.mock.calls[0]![0] as Record<string, unknown>;
    expect(query).toMatchObject({
      tags: ["gothic", "museum"],
      minPercent: 50,
      limit: 600,
    });
    expect(query.south).toBeLessThan(START.lat);
    expect(query.north).toBeGreaterThan(START.lat);
    expect(query.west).toBeLessThan(START.lng);
    expect(query.east).toBeGreaterThan(START.lng);
  });

  it("does not ask at all without tags", async () => {
    const { service, findCandidates } = setup(300, []);
    expect(await service.selectCandidates({ ...SHORT, tags: [] })).toEqual([]);
    expect(findCandidates).not.toHaveBeenCalled();
  });

  it("values relevance and significance, best first", async () => {
    const { service } = setup(300, [
      near("weak", { tags: { gothic: 55 } }),
      near("strong", { tags: { museum: 95 }, significance: 100 }),
    ]);
    const picked = await service.selectCandidates(SHORT);
    expect(picked.map((c) => c.place.id)).toEqual(["strong", "weak"]);
    expect(picked[0]).toMatchObject({ dwellMinutes: 10 });
  });

  it("drops places whose detour does not fit the budget", async () => {
    const { service } = setup(300, [
      near("near"),
      near("far", { latitude: 51.3, longitude: 17.4 }),
    ]);
    const picked = await service.selectCandidates(SHORT);
    expect(picked.map((c) => c.place.id)).toEqual(["near"]);
  });
});

describe("walkMinutes", () => {
  it("is zero for the same point", () => {
    expect(walkMinutes({ lat: 51.1, lng: 17 }, { lat: 51.1, lng: 17 })).toBe(0);
  });

  it("estimates a kilometre north at about 17 minutes with the detour factor", () => {
    const minutes = walkMinutes(
      { lat: 51.1, lng: 17 },
      { lat: 51.109, lng: 17 },
    );
    expect(minutes).toBeGreaterThan(17);
    expect(minutes).toBeLessThan(18);
  });

  it("is symmetric and faster at a higher speed", () => {
    const a = { lat: 51.1, lng: 17 };
    const b = { lat: 51.12, lng: 17.05 };
    expect(walkMinutes(a, b)).toBeCloseTo(walkMinutes(b, a));
    expect(walkMinutes(a, b, 6)).toBeLessThan(walkMinutes(a, b));
  });
});
