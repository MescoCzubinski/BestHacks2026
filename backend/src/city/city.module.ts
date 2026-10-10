import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { City } from "./entities/city.entity";
import { CityQueryService } from "./services/city-query.service";

@Module({
  imports: [TypeOrmModule.forFeature([City])],
  providers: [CityQueryService],
  exports: [CityQueryService],
})
export class CityModule {}
