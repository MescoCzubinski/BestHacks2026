import { Injectable, type OnModuleInit } from "@nestjs/common";
import { EventBus } from "../../common/bus/event-bus";
import { PlaceCandidateService } from "../services/place-candidate.service";

@Injectable()
export class PlacesListener implements OnModuleInit {
  constructor(
    private readonly bus: EventBus,
    private readonly candidates: PlaceCandidateService,
  ) {}

  onModuleInit(): void {
    this.bus.respond("place.candidates", (query) =>
      this.candidates.find(query),
    );
  }
}
