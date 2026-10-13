import type { RoutedPath } from "../../common/bus/contracts";
import type { EventBus } from "../../common/bus/event-bus";
import { DomainException } from "../../common/errors/domain.exception";
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

class Outside extends DomainException {
  constructor() {
    super("invalid", "outside");
  }
}

function setup(inside = true) {
  const plan = jest.fn().mockResolvedValue({ stops: STOPS, extras: EXTRAS });
  const request = jest.fn(async (name: string) => {
    if (name === "city.ensure-inside" && !inside) throw new Outside();
    return name === "path.route" ? PATH : undefined;
  });
  const service = new RouteBuilderService(
    { request } as unknown as EventBus,
    { plan } as unknown as RoutePlanner,
  );
  return { service, plan, request };
}

describe("RouteBuilderService", () => {
  it("walks from the start through the planned stops to the end", async () => {
    const { service, plan, request } = setup();
    const route = await service.build(QUERY);
    expect(request).toHaveBeenCalledWith("city.ensure-inside", {
      points: [START, END],
    });
    expect(plan).toHaveBeenCalledWith(QUERY);
    expect(request).toHaveBeenCalledWith("path.route", {
      points: [
        START,
        { lat: 51.11, lng: 17.032 },
        { lat: 51.112, lng: 17.045 },
        END,
      ],
    });
    expect(route).toEqual({ stops: STOPS, extras: EXTRAS, path: PATH });
  });

  it("refuses a start or end outside the supported cities before planning", async () => {
    const { service, plan, request } = setup(false);
    await expect(service.build(QUERY)).rejects.toThrow(Outside);
    expect(plan).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalledWith("path.route", expect.anything());
  });
});
