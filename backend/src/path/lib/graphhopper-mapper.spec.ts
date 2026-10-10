import { mapGraphHopperPath } from "./graphhopper-mapper";

describe("mapGraphHopperPath", () => {
  it("converts distance, time and [lon, lat] points", () => {
    expect(
      mapGraphHopperPath({
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
    expect(mapGraphHopperPath({})).toBeNull();
    expect(mapGraphHopperPath({ paths: [] })).toBeNull();
    expect(
      mapGraphHopperPath({
        paths: [{ distance: 1, time: 1, points: { coordinates: [] } }],
      }),
    ).toBeNull();
  });
});
