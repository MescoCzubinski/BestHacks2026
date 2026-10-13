import { Module } from "@nestjs/common";
import { DirectionsController } from "./handlers/directions.controller";
import { DirectionsListener } from "./handlers/directions.listener";
import { DirectionsService } from "./services/directions.service";
import { GraphHopperClient } from "./services/graphhopper.client";

@Module({
  controllers: [DirectionsController],
  providers: [DirectionsService, GraphHopperClient, DirectionsListener],
})
export class DirectionsModule {}
