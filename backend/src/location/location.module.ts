import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { City } from "./entities/city.entity";
import { LocationController } from "./handlers/location.controller";
import { LocationListener } from "./handlers/location.listener";
import { CityRepository } from "./repositories/city.repository";
import { CityQueryService } from "./services/city-query.service";
import { Geocoder } from "./services/geocoder";
import { LocationReverseService } from "./services/location-reverse.service";
import { LocationSearchService } from "./services/location-search.service";
import { PhotonGeocoder } from "./services/photon-geocoder.service";
import { PhotonLocationMapper } from "./services/photon-location-mapper.service";

@Module({
  imports: [TypeOrmModule.forFeature([City])],
  controllers: [LocationController],
  providers: [
    CityRepository,
    CityQueryService,
    PhotonLocationMapper,
    LocationSearchService,
    LocationReverseService,
    LocationListener,
    { provide: Geocoder, useClass: PhotonGeocoder },
  ],
})
export class LocationModule {}
