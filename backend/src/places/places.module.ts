import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LocationController } from "./handlers/location.controller";
import { PlaceController } from "./handlers/place.controller";
import { PlacesListener } from "./handlers/places.listener";
import { PlaceTag } from "./entities/place-tag.entity";
import { Place } from "./entities/place.entity";
import { PlaceRepository } from "./repositories/place.repository";
import { Geocoder } from "./services/geocoder";
import { LocationReverseService } from "./services/location-reverse.service";
import { LocationSearchService } from "./services/location-search.service";
import { PhotonGeocoder } from "./services/photon-geocoder.service";
import { PhotonLocationMapper } from "./services/photon-location-mapper.service";
import { PlaceCandidateService } from "./services/place-candidate.service";
import { PlaceSearchService } from "./services/place-search.service";
import { VisitDurationService } from "./services/visit-duration.service";

@Module({
  imports: [TypeOrmModule.forFeature([Place, PlaceTag])],
  controllers: [PlaceController, LocationController],
  providers: [
    PlaceRepository,
    PlaceSearchService,
    PlaceCandidateService,
    VisitDurationService,
    PhotonLocationMapper,
    LocationSearchService,
    LocationReverseService,
    PlacesListener,
    { provide: Geocoder, useClass: PhotonGeocoder },
  ],
})
export class PlacesModule {}
