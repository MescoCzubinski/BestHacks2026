import { Module } from "@nestjs/common";
import { CityModule } from "../city/city.module";
import { PathController } from "./handlers/path.controller";
import { GraphHopperPathMapper } from "./services/graphhopper-path-mapper.service";
import { GraphHopperRouter } from "./services/graphhopper-router.service";
import { PathFinderService } from "./services/path-finder.service";
import { PathRouter } from "./services/path-router";

@Module({
  imports: [CityModule],
  controllers: [PathController],
  exports: [PathFinderService],
  providers: [
    PathFinderService,
    GraphHopperPathMapper,
    { provide: PathRouter, useClass: GraphHopperRouter },
  ],
})
export class PathModule {}
