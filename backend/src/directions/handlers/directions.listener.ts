import { Injectable, type OnModuleInit } from "@nestjs/common";
import { EventBus } from "../../common/bus/event-bus";
import { DirectionsService } from "../services/directions.service";

@Injectable()
export class DirectionsListener implements OnModuleInit {
  constructor(
    private readonly bus: EventBus,
    private readonly directions: DirectionsService,
  ) {}

  onModuleInit(): void {
    this.bus.respond("directions.route", ({ points }) =>
      this.directions.find(points),
    );
  }
}
