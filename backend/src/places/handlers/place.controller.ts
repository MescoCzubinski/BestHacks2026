import { Controller, Get, Query } from "@nestjs/common";
import { PlaceSearchService } from "../services/place-search.service";
import { SearchPlacesDto } from "./dto/search-places.dto";

@Controller("places")
export class PlaceController {
  constructor(private readonly placeSearch: PlaceSearchService) {}

  @Get()
  search(@Query() dto: SearchPlacesDto) {
    return this.placeSearch.search(dto.query, dto.limit);
  }
}
