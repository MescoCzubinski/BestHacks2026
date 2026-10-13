import { Module } from "@nestjs/common";
import { PathController } from "./handlers/path.controller";
import { PathListener } from "./handlers/path.listener";
import { GraphHopperPathMapper } from "./services/graphhopper-path-mapper.service";
import { GraphHopperRouter } from "./services/graphhopper-router.service";
import { PathFinderService } from "./services/path-finder.service";
import { PathRouter } from "./services/path-router";

@Module({
  controllers: [PathController],
  providers: [
    PathFinderService,
    GraphHopperPathMapper,
    PathListener,
    { provide: PathRouter, useClass: GraphHopperRouter },
  ],
})
export class PathModule {}
