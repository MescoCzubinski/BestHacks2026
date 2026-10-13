import { Module } from "@nestjs/common";
import { DirectionsController } from "./handlers/directions.controller";
import { DirectionsListener } from "./handlers/directions.listener";
import { GraphHopperPathMapper } from "./services/graphhopper-path-mapper.service";
import { GraphHopperRouter } from "./services/graphhopper-router.service";
import { PathFinderService } from "./services/path-finder.service";
import { PathRouter } from "./services/path-router";

@Module({
  controllers: [DirectionsController],
  providers: [
    PathFinderService,
    GraphHopperPathMapper,
    DirectionsListener,
    { provide: PathRouter, useClass: GraphHopperRouter },
  ],
})
export class DirectionsModule {}
