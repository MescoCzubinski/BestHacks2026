import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PlaceTag } from "../../../places/place-tag.entity";
import { Place } from "../../../places/place.entity";
import { SeedService } from "./seed.service";

@Module({
  imports: [TypeOrmModule.forFeature([Place, PlaceTag])],
  providers: [SeedService],
})
export class SeedModule {}
