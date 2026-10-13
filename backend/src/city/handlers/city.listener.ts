import { Injectable, type OnModuleInit } from "@nestjs/common";
import { EventBus } from "../../common/bus/event-bus";
import { CityQueryService } from "../services/city-query.service";

@Injectable()
export class CityListener implements OnModuleInit {
  constructor(
    private readonly bus: EventBus,
    private readonly cities: CityQueryService,
  ) {}

  onModuleInit(): void {
    this.bus.respond("city.supported", () => this.cities.listSupported());
    this.bus.respond("city.support-at", (point) =>
      this.cities.checkSupport(point),
    );
    this.bus.respond("city.ensure-inside", ({ points }) =>
      this.cities.assertInsideSupported(points),
    );
  }
}
