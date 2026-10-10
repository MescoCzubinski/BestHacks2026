import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PlaceTag } from "./place-tag.entity";
import { Place } from "./place.entity";
import { PlaceQueryService } from "./services/place-query.service";

@Module({
  imports: [TypeOrmModule.forFeature([Place, PlaceTag])],
  providers: [PlaceQueryService],
  exports: [PlaceQueryService],
})
export class PlacesModule {}
