import type {
  PlaceRepository,
  PlaceRow,
} from "../repositories/place.repository";
import { isEnterable, PlaceService, visitMinutes } from "./place.service";
import type { CandidateQuery } from "./types";

const QUERY: CandidateQuery = {
  south: 51,
  west: 16.9,
  north: 51.2,
  east: 17.1,
  tags: ["museum"],
  minPercent: 50,
  limit: 10,
};

const MUSEUM: PlaceRow = {
  id: "p1",
  name: "Muzeum Narodowe",
  latitude: 51.11,
  longitude: 17.047,
  description: "Sztuka",
  mainImageUrl: "https://img/p1.jpg",
  significance: 0,
  facts: { openingHours: "Tu-Su 10:00-17:00" },
  tags: { museum: 90 },
};

function setup(found: PlaceRow[] = [MUSEUM]) {
  const findByName = jest.fn().mockResolvedValue(found);
  const findInBoxWithTags = jest.fn().mockResolvedValue(found);
  const service = new PlaceService({
    findByName,
    findInBoxWithTags,
  } as unknown as PlaceRepository);
  return { service, findByName, findInBoxWithTags };
}

describe("PlaceService.search", () => {
  it("looks up the trimmed text with the requested limit", async () => {
    const { service, findByName } = setup([]);
    await service.search("  muzeum ", 5);
    expect(findByName).toHaveBeenCalledWith("muzeum", 5);
  });

  it("describes each match as a stop with a visit time and entry flag", async () => {
    const { service } = setup([{ ...MUSEUM, description: null }]);
    expect(await service.search("muzeum")).toEqual([
      {
        id: "p1",
        name: "Muzeum Narodowe",
        description: "",
        lat: 51.11,
        lng: 17.047,
        visitMinutes: 45,
        enterable: true,
        imageUrl: "https://img/p1.jpg",
      },
    ]);
  });

  it("returns an empty list when nothing matches", async () => {
    expect(await setup([]).service.search("zzz")).toEqual([]);
  });
});

describe("PlaceService.findCandidates", () => {
  it("passes the query through and adds visit time, entry and access facts", async () => {
    const { service, findInBoxWithTags } = setup();
    expect(await service.findCandidates(QUERY)).toEqual([
      {
        id: "p1",
        name: "Muzeum Narodowe",
        latitude: 51.11,
        longitude: 17.047,
        description: "Sztuka",
        mainImageUrl: "https://img/p1.jpg",
        significance: 0,
        tags: { museum: 90 },
        openingHours: "Tu-Su 10:00-17:00",
        visitMinutes: 45,
        enterable: true,
      },
    ]);
    expect(findInBoxWithTags).toHaveBeenCalledWith(QUERY);
  });

  it("leaves unknown opening hours empty", async () => {
    const { service } = setup([{ ...MUSEUM, facts: {} }]);
    const [candidate] = await service.findCandidates(QUERY);
    expect(candidate).toMatchObject({ openingHours: null });
  });
});

describe("visit duration", () => {
  it("marks places with an inside as enterable", () => {
    expect(isEnterable({ museum: 90 })).toBe(true);
    expect(isEnterable({ museum: 20 })).toBe(false);
    expect(isEnterable({ street_art: 90, sculpture: 80 })).toBe(false);
  });

  it("uses the strongest known type tag and grows with significance", () => {
    expect(visitMinutes({ museum: 90 }, 0)).toBe(45);
    expect(visitMinutes({ museum: 90 }, 100)).toBeGreaterThan(45);
    expect(visitMinutes({ sculpture: 80, street_art: 80 }, 0)).toBe(3);
    expect(visitMinutes({}, 0)).toBe(8);
  });
});
