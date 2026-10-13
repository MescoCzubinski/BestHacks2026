import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PlaceController } from "./handlers/place.controller";
import { PlaceTag } from "./entities/place-tag.entity";
import { Place } from "./entities/place.entity";
import { PlaceRepository } from "./repositories/place.repository";
import { CandidateSelectionService } from "./services/candidate-selection.service";
import { OpeningHoursService } from "./services/opening-hours.service";
import { OrienteeringRoutePlanner } from "./services/orienteering-route-planner.service";
import { OrienteeringService } from "./services/orienteering.service";
import { PlaceCandidateService } from "./services/place-candidate.service";
import { PlaceSearchService } from "./services/place-search.service";
import { RouteBuilderService } from "./services/route-builder.service";
import { RoutePlanner } from "./services/route-planner";
import { VisitDurationService } from "./services/visit-duration.service";
import { WalkingEstimateService } from "./services/walking-estimate.service";

@Module({
  imports: [TypeOrmModule.forFeature([Place, PlaceTag])],
  controllers: [PlaceController],
  providers: [
    PlaceRepository,
    PlaceSearchService,
    PlaceCandidateService,
    VisitDurationService,
    RouteBuilderService,
    CandidateSelectionService,
    OrienteeringService,
    OpeningHoursService,
    WalkingEstimateService,
    { provide: RoutePlanner, useClass: OrienteeringRoutePlanner },
  ],
})
export class PlacesModule {}
