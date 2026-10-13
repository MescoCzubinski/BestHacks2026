import type { PlaceCandidate } from "./place-candidate";
import { CandidateSelectionService } from "./candidate-selection.service";
import type { PlaceCandidateService } from "./place-candidate.service";
import type { RouteQuery } from "./route-planner";
import { WalkingEstimateService } from "./walking-estimate.service";

const START = { lat: 51.11, lng: 17.03 };

const QUERY: RouteQuery = {
  start: START,
  end: START,
  durationMinutes: 60,
  wheelchair: false,
  tags: ["gothic", "museum"],
};

const place = (
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
  wheelchair: null,
  openingHours: null,
  visitMinutes: 10,
  enterable: false,
  ...over,
});

function setup(found: PlaceCandidate[]) {
  const find = jest.fn().mockResolvedValue(found);
  const service = new CandidateSelectionService(
    { find } as unknown as PlaceCandidateService,
    new WalkingEstimateService(),
  );
  return { service, find };
}

describe("CandidateSelectionService", () => {
  it("asks for candidates in a box the walk can reach", async () => {
    const { service, find } = setup([]);
    await service.select(QUERY);
    const [query] = find.mock.calls[0]!;
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
    const { service, find } = setup([]);
    expect(await service.select({ ...QUERY, tags: [] })).toEqual([]);
    expect(find).not.toHaveBeenCalled();
  });

  it("values relevance and significance, best first", async () => {
    const { service } = setup([
      place("weak", { tags: { gothic: 55 } }),
      place("strong", { tags: { museum: 95 }, significance: 100 }),
    ]);
    const picked = await service.select(QUERY);
    expect(picked.map((c) => c.place.id)).toEqual(["strong", "weak"]);
    expect(picked[0]).toMatchObject({
      dwellMinutes: 10,
      accessibility: "unknown",
    });
  });

  it("drops places whose detour does not fit the budget", async () => {
    const { service } = setup([
      place("near"),
      place("far", { latitude: 51.3, longitude: 17.4 }),
    ]);
    const picked = await service.select(QUERY);
    expect(picked.map((c) => c.place.id)).toEqual(["near"]);
  });

  it("drops inaccessible places and boosts accessible ones for wheelchair users", async () => {
    const { service } = setup([
      place("stairs", { wheelchair: "no" }),
      place("unknown"),
      place("ramp", { wheelchair: "yes" }),
    ]);
    const picked = await service.select({ ...QUERY, wheelchair: true });
    expect(picked.map((c) => c.place.id)).toEqual(["ramp", "unknown"]);
    expect(picked[0]?.accessibility).toBe("yes");
  });
});
