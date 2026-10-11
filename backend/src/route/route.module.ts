import { Module } from "@nestjs/common";
import { CityModule } from "../city/city.module";
import { PathModule } from "../path/path.module";
import { PlacesModule } from "../places/places.module";
import { RouteController } from "./handlers/route.controller";
import { CandidateSelectionService } from "./services/candidate-selection.service";
import { OpeningHoursService } from "./services/opening-hours.service";
import { OrienteeringRoutePlanner } from "./services/orienteering-route-planner.service";
import { OrienteeringService } from "./services/orienteering.service";
import { RouteBuilderService } from "./services/route-builder.service";
import { RoutePlanner } from "./services/route-planner";
import { WalkingEstimateService } from "./services/walking-estimate.service";

@Module({
  imports: [CityModule, PathModule, PlacesModule],
  controllers: [RouteController],
  providers: [
    RouteBuilderService,
    CandidateSelectionService,
    OrienteeringService,
    OpeningHoursService,
    WalkingEstimateService,
    { provide: RoutePlanner, useClass: OrienteeringRoutePlanner },
  ],
})
export class RouteModule {}
