import { Controller, Get, Query } from "@nestjs/common";
import { LocationService } from "../services/location.service";
import { ReverseLocationDto } from "./dto/reverse-location.dto";
import { SearchLocationsDto } from "./dto/search-locations.dto";

@Controller("locations")
export class LocationController {
  constructor(private readonly locations: LocationService) {}

  @Get()
  find(@Query() dto: SearchLocationsDto) {
    return this.locations.search(dto.query, dto.limit);
  }

  @Get("reverse")
  reverse(@Query() dto: ReverseLocationDto) {
    return this.locations.reverse(dto.lat, dto.lng);
  }
}
