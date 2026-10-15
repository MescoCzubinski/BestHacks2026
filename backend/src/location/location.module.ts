import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { City } from "./entities/city.entity";
import { LocationController } from "./handlers/location.controller";
import { LocationListener } from "./handlers/location.listener";
import { CityRepository } from "./repositories/city.repository";
import { LocationService } from "./services/location.service";
import { PhotonClient } from "./services/photon.client";

@Module({
  imports: [TypeOrmModule.forFeature([City])],
  controllers: [LocationController],
  providers: [CityRepository, LocationService, PhotonClient, LocationListener],
})
export class LocationModule {}
