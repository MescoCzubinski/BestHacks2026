import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PlaceController } from "./handlers/place.controller";
import { PlaceTag } from "./entities/place-tag.entity";
import { Place } from "./entities/place.entity";
import { PlaceRepository } from "./repositories/place.repository";
import { PlaceService } from "./services/place.service";
import { PlanService } from "./services/plan.service";

@Module({
  imports: [TypeOrmModule.forFeature([Place, PlaceTag])],
  controllers: [PlaceController],
  providers: [PlaceRepository, PlaceService, PlanService],
})
export class PlacesModule {}
