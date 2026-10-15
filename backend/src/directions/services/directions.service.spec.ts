import type { RoutedPath } from "../../common/bus/contracts";
import type { EventBus } from "../../common/bus/event-bus";
import { DomainException } from "../../common/errors/domain.exception";
import { DirectionsService } from "./directions.service";
import type { GraphHopperClient } from "./graphhopper.client";

const POINTS = [
  { lat: 51.1079, lng: 17.0385 },
  { lat: 51.1097, lng: 17.0447 },
];

const PATH: RoutedPath = {
  distanceMeters: 690,
  durationSeconds: 497,
  coordinates: POINTS,
};

class Outside extends DomainException {
  constructor() {
    super("invalid", "outside");
  }
}

function setup(inside = true) {
  const route = jest.fn().mockResolvedValue(PATH);
  const request = jest.fn(async () => {
    if (!inside) throw new Outside();
  });
  const service = new DirectionsService(
    { request } as unknown as EventBus,
    { route } as unknown as GraphHopperClient,
  );
  return { service, route, request };
}

describe("DirectionsService", () => {
  it("routes through the points after the location slice accepts them", async () => {
    const { service, route, request } = setup();
    expect(await service.find(POINTS)).toBe(PATH);
    expect(request).toHaveBeenCalledWith("location.ensure-inside", {
      points: POINTS,
    });
    expect(route).toHaveBeenCalledWith(POINTS);
  });

  it("does not call the router for points outside supported cities", async () => {
    const { service, route } = setup(false);
    await expect(service.find(POINTS)).rejects.toThrow(Outside);
    expect(route).not.toHaveBeenCalled();
  });
});
