import { Module } from "@nestjs/common";
import { PathModule } from "../path/path.module";
import { PlacesModule } from "../places/places.module";
import { RouteController } from "./handlers/route.controller";
import { CandidateSelectionService } from "./services/candidate-selection.service";
import { RoutePlanService } from "./services/route-plan.service";

@Module({
  imports: [PlacesModule, PathModule],
  controllers: [RouteController],
  providers: [CandidateSelectionService, RoutePlanService],
})
export class RouteModule {}
