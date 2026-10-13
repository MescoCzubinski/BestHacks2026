import type { ConfigService } from "@nestjs/config";
import type { PlaceCandidate } from "../../common/bus/contracts";
import type { EventBus } from "../../common/bus/event-bus";
import { NoMatchingPlacesException } from "../exceptions/no-matching-places.exception";
import { TimeBudgetTooSmallException } from "../exceptions/time-budget-too-small.exception";
import { CandidateSelectionService } from "./candidate-selection.service";
import { OpeningHoursService } from "./opening-hours.service";
import { OrienteeringRoutePlanner } from "./orienteering-route-planner.service";
import { OrienteeringService } from "./orienteering.service";
import type { RouteQuery } from "./route-planner";
import { WalkingEstimateService } from "./walking-estimate.service";

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
    wheelchair: null,
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
  place("stairs", 51.109, 17.029, { gothic: 70 }, 10, false, {
    significance: 40,
    wheelchair: "no",
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
  wheelchair: true,
  tags: ["gothic"],
  startTime: START_TIME,
};

function setup(walkSecondsPerLeg = 300) {
  const walking = new WalkingEstimateService();
  const findCandidates = jest.fn(async () => PLACES);
  const find = jest.fn(async (points: unknown[]) => ({
    distanceMeters: 1000,
    durationSeconds: (points.length - 1) * walkSecondsPerLeg,
    coordinates: [],
  }));
  const bus = {
    request: jest.fn(async (name: string, payload: { points?: unknown[] }) =>
      name === "place.candidates" ? findCandidates() : find(payload.points!),
    ),
  } as unknown as EventBus;
  const planner = new OrienteeringRoutePlanner(
    new CandidateSelectionService(bus, walking),
    bus,
    new OrienteeringService(),
    new OpeningHoursService(),
    walking,
    { get: () => "Europe/Warsaw" } as unknown as ConfigService,
  );
  return { planner, bus, find };
}

describe("OrienteeringRoutePlanner (characterization)", () => {
  it("plans the current stops, order, timing and extras", async () => {
    const { planner, bus } = setup();
    const route = await planner.plan(QUERY);
    expect(bus.request).toHaveBeenCalledWith(
      "place.candidates",
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
    const { planner, find } = setup(2000);
    const route = await planner.plan(QUERY);
    expect(find.mock.calls.length).toBeGreaterThan(1);
    expect(route).toEqual({
      stops: [stop("church", 20, true, "2026-10-12T08:08:22.128Z")],
      extras: [
        stop("closed", 12, false),
        stop("tower", 20, true),
        stop("museum", 65, true),
      ],
    });
  });

  it("refuses a budget shorter than the direct walk", async () => {
    const { planner } = setup();
    await expect(
      planner.plan({
        ...QUERY,
        end: { lat: 51.2, lng: 17.2 },
        durationMinutes: 15,
      }),
    ).rejects.toThrow(TimeBudgetTooSmallException);
  });

  it("reports no matching places for tags nothing carries", async () => {
    const { planner } = setup();
    await expect(planner.plan({ ...QUERY, tags: [] })).rejects.toThrow(
      NoMatchingPlacesException,
    );
  });
});
