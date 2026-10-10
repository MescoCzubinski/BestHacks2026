import { Controller, Get, Query } from "@nestjs/common";
import { Public } from "../../common/auth/decorators";
import { LocationReverseService } from "../services/location-reverse.service";
import { LocationSearchService } from "../services/location-search.service";
import { ReverseLocationDto } from "./dto/reverse-location.dto";
import { SearchLocationsDto } from "./dto/search-locations.dto";

@Public()
@Controller("locations")
export class LocationController {
  constructor(
    private readonly search: LocationSearchService,
    private readonly reverseLookup: LocationReverseService,
  ) {}

  @Get()
  find(@Query() dto: SearchLocationsDto) {
    return this.search.search(dto.query, dto.limit);
  }

  @Get("reverse")
  reverse(@Query() dto: ReverseLocationDto) {
    return this.reverseLookup.reverse(dto.lat, dto.lng);
  }
}
