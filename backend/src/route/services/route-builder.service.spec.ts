import { OutsideSupportedAreaException } from "../../city/exceptions/outside-supported-area.exception";
import type { CityQueryService } from "../../city/services/city-query.service";
import type { PathFinderService } from "../../path/services/path-finder.service";
import type { RoutedPath } from "../../path/services/path-router";
import { RouteBuilderService } from "./route-builder.service";
import type { PlannedStop, RoutePlanner, RouteQuery } from "./route-planner";

const START = { lat: 51.1, lng: 17.03 };
const END = { lat: 51.105, lng: 17.04 };
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
const EXTRAS: PlannedStop[] = [
  {
    id: "c",
    name: "C",
    description: "",
    lat: 51.113,
    lng: 17.05,
    visitMinutes: 10,
    enterable: false,
  },
];
const PATH: RoutedPath = {
  distanceMeters: 1000,
  durationSeconds: 700,
  coordinates: [START, END],
};
const QUERY: RouteQuery = {
  start: START,
  end: END,
  durationMinutes: 90,
  wheelchair: true,
  tags: ["art_nouveau"],
};

function setup(inside = true) {
  const assertInsideSupported = jest.fn(async () => {
    if (!inside) throw new OutsideSupportedAreaException();
  });
  const plan = jest.fn().mockResolvedValue({ stops: STOPS, extras: EXTRAS });
  const find = jest.fn().mockResolvedValue(PATH);
  const service = new RouteBuilderService(
    { assertInsideSupported } as unknown as CityQueryService,
    { plan } as unknown as RoutePlanner,
    { find } as unknown as PathFinderService,
  );
  return { service, plan, find, assertInsideSupported };
}

describe("RouteBuilderService", () => {
  it("walks from the start through the planned stops to the end", async () => {
    const { service, plan, find, assertInsideSupported } = setup();
    const route = await service.build(QUERY);
    expect(assertInsideSupported).toHaveBeenCalledWith([START, END]);
    expect(plan).toHaveBeenCalledWith(QUERY);
    expect(find).toHaveBeenCalledWith([START, ...STOPS, END]);
    expect(route).toEqual({ stops: STOPS, extras: EXTRAS, path: PATH });
  });

  it("refuses a start or end outside the supported cities before planning", async () => {
    const { service, plan, find } = setup(false);
    await expect(service.build(QUERY)).rejects.toThrow(
      OutsideSupportedAreaException,
    );
    expect(plan).not.toHaveBeenCalled();
    expect(find).not.toHaveBeenCalled();
  });
});
