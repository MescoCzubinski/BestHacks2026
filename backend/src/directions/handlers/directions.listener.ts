import { Injectable, type OnModuleInit } from "@nestjs/common";
import { EventBus } from "../../common/bus/event-bus";
import { PathFinderService } from "../services/path-finder.service";

@Injectable()
export class DirectionsListener implements OnModuleInit {
  constructor(
    private readonly bus: EventBus,
    private readonly pathFinder: PathFinderService,
  ) {}

  onModuleInit(): void {
    this.bus.respond("directions.route", ({ points }) =>
      this.pathFinder.find(points),
    );
  }
}
