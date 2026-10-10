import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { City } from "../../../city/entities/city.entity";
import { PlaceTag } from "../../../places/place-tag.entity";
import { Place } from "../../../places/place.entity";
import { SeedService } from "./seed.service";

@Module({
  imports: [TypeOrmModule.forFeature([City, Place, PlaceTag])],
  providers: [SeedService],
})
export class SeedModule {}
