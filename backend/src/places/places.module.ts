import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CityModule } from "../city/city.module";
import { LocationController } from "./handlers/location.controller";
import { PlaceController } from "./handlers/place.controller";
import { PlaceTag } from "./place-tag.entity";
import { Place } from "./place.entity";
import { Geocoder } from "./services/geocoder";
import { LocationReverseService } from "./services/location-reverse.service";
import { LocationSearchService } from "./services/location-search.service";
import { PhotonGeocoder } from "./services/photon-geocoder.service";
import { PlaceSearchService } from "./services/place-search.service";

@Module({
  imports: [TypeOrmModule.forFeature([Place, PlaceTag]), CityModule],
  controllers: [PlaceController, LocationController],
  providers: [
    PlaceSearchService,
    LocationSearchService,
    LocationReverseService,
    { provide: Geocoder, useClass: PhotonGeocoder },
  ],
  exports: [PlaceSearchService],
})
export class PlacesModule {}
