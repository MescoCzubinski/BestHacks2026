import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccountModule } from "../../../account/account.module";
import { User } from "../../../account/entities/user.entity";
import { City } from "../../../city/entities/city.entity";
import { PlaceTag } from "../../../places/place-tag.entity";
import { Place } from "../../../places/place.entity";
import { SeedService } from "./seed.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([City, Place, PlaceTag, User]),
    AccountModule,
  ],
  providers: [SeedService],
})
export class SeedModule {}
