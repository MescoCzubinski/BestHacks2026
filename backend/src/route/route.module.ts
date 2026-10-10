import { Module } from "@nestjs/common";
import { CityModule } from "../city/city.module";
import { PathModule } from "../path/path.module";
import { RouteController } from "./handlers/route.controller";
import { MockRoutePlanner } from "./services/mock-route-planner.service";
import { RouteBuilderService } from "./services/route-builder.service";
import { RoutePlanner } from "./services/route-planner";

@Module({
  imports: [CityModule, PathModule],
  controllers: [RouteController],
  providers: [
    RouteBuilderService,
    { provide: RoutePlanner, useClass: MockRoutePlanner },
  ],
})
export class RouteModule {}
