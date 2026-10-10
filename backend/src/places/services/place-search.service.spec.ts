import { PlaceSearchService } from "./place-search.service";

describe("PlaceSearchService", () => {
  it("returns no places until the places data is complete", async () => {
    expect(await new PlaceSearchService().search("rynek")).toEqual([]);
  });
});
