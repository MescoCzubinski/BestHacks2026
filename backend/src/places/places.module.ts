import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PlaceTag } from "./place-tag.entity";
import { Place } from "./place.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Place, PlaceTag])],
})
export class PlacesModule {}
