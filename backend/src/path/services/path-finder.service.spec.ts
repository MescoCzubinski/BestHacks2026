import { OutsideSupportedAreaException } from "../../city/exceptions/outside-supported-area.exception";
import type { CityQueryService } from "../../city/services/city-query.service";
import type { PathRouter, RoutedPath } from "./path-router";
import { PathFinderService } from "./path-finder.service";

const POINTS = [
  { lat: 51.1079, lng: 17.0385 },
  { lat: 51.1097, lng: 17.0447 },
];

const PATH: RoutedPath = {
  distanceMeters: 690,
  durationSeconds: 497,
  coordinates: POINTS,
};

function setup(inside = true) {
  const route = jest.fn().mockResolvedValue(PATH);
  const assertInsideSupported = jest.fn(async () => {
    if (!inside) throw new OutsideSupportedAreaException();
  });
  const service = new PathFinderService(
    { assertInsideSupported } as unknown as CityQueryService,
    { route } as unknown as PathRouter,
  );
  return { service, route, assertInsideSupported };
}

describe("PathFinderService", () => {
  it("routes through the points after checking them", async () => {
    const { service, route, assertInsideSupported } = setup();
    expect(await service.find(POINTS)).toBe(PATH);
    expect(assertInsideSupported).toHaveBeenCalledWith(POINTS);
    expect(route).toHaveBeenCalledWith(POINTS);
  });

  it("does not call the router for points outside supported cities", async () => {
    const { service, route } = setup(false);
    await expect(service.find(POINTS)).rejects.toThrow(
      OutsideSupportedAreaException,
    );
    expect(route).not.toHaveBeenCalled();
  });
});
