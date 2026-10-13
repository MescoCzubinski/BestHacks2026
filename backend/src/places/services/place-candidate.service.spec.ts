import type { CandidateQuery } from "../../common/bus/contracts";
import type {
  PlaceRepository,
  PlaceRow,
} from "../repositories/place.repository";
import { PlaceCandidateService } from "./place-candidate.service";
import { VisitDurationService } from "./visit-duration.service";

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
  mainImageUrl: null,
  significance: 0,
  facts: { wheelchair: "limited", openingHours: "Tu-Su 10:00-17:00" },
  tags: { museum: 90 },
};

describe("PlaceCandidateService", () => {
  it("passes the query through and adds visit time, entry and access facts", async () => {
    const findInBoxWithTags = jest.fn().mockResolvedValue([MUSEUM]);
    const service = new PlaceCandidateService(
      { findInBoxWithTags } as unknown as PlaceRepository,
      new VisitDurationService(),
    );

    expect(await service.find(QUERY)).toEqual([
      {
        id: "p1",
        name: "Muzeum Narodowe",
        latitude: 51.11,
        longitude: 17.047,
        description: "Sztuka",
        mainImageUrl: null,
        significance: 0,
        tags: { museum: 90 },
        wheelchair: "limited",
        openingHours: "Tu-Su 10:00-17:00",
        visitMinutes: 45,
        enterable: true,
      },
    ]);
    expect(findInBoxWithTags).toHaveBeenCalledWith(QUERY);
  });

  it("leaves unknown access and opening hours empty", async () => {
    const service = new PlaceCandidateService(
      {
        findInBoxWithTags: async () => [{ ...MUSEUM, facts: {} }],
      } as unknown as PlaceRepository,
      new VisitDurationService(),
    );
    const [candidate] = await service.find(QUERY);
    expect(candidate).toMatchObject({ wheelchair: null, openingHours: null });
  });
});
