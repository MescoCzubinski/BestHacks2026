import { Injectable, type OnModuleInit } from "@nestjs/common";
import { EventBus } from "../../common/bus/event-bus";
import { CityQueryService } from "../services/city-query.service";

@Injectable()
export class LocationListener implements OnModuleInit {
  constructor(
    private readonly bus: EventBus,
    private readonly cities: CityQueryService,
  ) {}

  onModuleInit(): void {
    this.bus.respond("location.ensure-inside", ({ points }) =>
      this.cities.assertInsideSupported(points),
    );
  }
}
