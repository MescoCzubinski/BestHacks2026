import { Controller, Get, Query } from "@nestjs/common";
import { Public } from "../../common/auth/decorators";
import { PlaceSearchService } from "../services/place-search.service";
import { SearchPlacesDto } from "./dto/search-places.dto";

@Public()
@Controller("places")
export class PlaceController {
  constructor(private readonly placeSearch: PlaceSearchService) {}

  @Get()
  search(@Query() dto: SearchPlacesDto) {
    return this.placeSearch.search(dto.query, dto.limit);
  }
}
