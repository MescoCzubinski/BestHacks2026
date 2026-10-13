import { Injectable, type OnModuleInit } from "@nestjs/common";
import { EventBus } from "../../common/bus/event-bus";
import { LocationService } from "../services/location.service";

@Injectable()
export class LocationListener implements OnModuleInit {
  constructor(
    private readonly bus: EventBus,
    private readonly locations: LocationService,
  ) {}

  onModuleInit(): void {
    this.bus.respond("location.ensure-inside", ({ points }) =>
      this.locations.assertInsideSupported(points),
    );
  }
}
