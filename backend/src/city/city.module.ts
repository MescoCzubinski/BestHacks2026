import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { City } from "./entities/city.entity";
import { CityListener } from "./handlers/city.listener";
import { CityRepository } from "./repositories/city.repository";
import { CityQueryService } from "./services/city-query.service";

@Module({
  imports: [TypeOrmModule.forFeature([City])],
  providers: [CityRepository, CityQueryService, CityListener],
})
export class CityModule {}
