import type {
  PlaceRepository,
  PlaceRow,
} from "../repositories/place.repository";
import { PlaceSearchService } from "./place-search.service";
import { VisitDurationService } from "./visit-duration.service";

const museum: PlaceRow = {
  id: "p1",
  name: "Muzeum Narodowe",
  latitude: 51.11,
  longitude: 17.047,
  description: null,
  mainImageUrl: "https://img/p1.jpg",
  significance: 0,
  facts: {},
  tags: { museum: 90 },
};

function service(found: PlaceRow[]) {
  const findByName = jest.fn().mockResolvedValue(found);
  const places = { findByName } as unknown as PlaceRepository;
  return {
    findByName,
    search: new PlaceSearchService(places, new VisitDurationService()),
  };
}

describe("PlaceSearchService", () => {
  it("looks up the trimmed text with the requested limit", async () => {
    const { search, findByName } = service([]);
    await search.search("  muzeum ", 5);
    expect(findByName).toHaveBeenCalledWith("muzeum", 5);
  });

  it("describes each match as a stop with a visit time and entry flag", async () => {
    const { search } = service([museum]);
    expect(await search.search("muzeum")).toEqual([
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
    expect(await service([]).search.search("zzz")).toEqual([]);
  });
});
