import { Module } from "@nestjs/common";
import { PathController } from "./handlers/path.controller";
import { GraphHopperClient } from "./services/graphhopper.client";
import { PathService } from "./services/path.service";

@Module({
  controllers: [PathController],
  providers: [GraphHopperClient, PathService],
  exports: [PathService],
})
export class PathModule {}
