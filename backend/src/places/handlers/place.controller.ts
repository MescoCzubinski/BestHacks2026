import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { PlaceSearchService } from "../services/place-search.service";
import { RouteBuilderService } from "../services/route-builder.service";
import { CreateRouteDto } from "./dto/create-route.dto";
import { SearchPlacesDto } from "./dto/search-places.dto";

@Controller("places")
export class PlaceController {
  constructor(
    private readonly placeSearch: PlaceSearchService,
    private readonly builder: RouteBuilderService,
  ) {}

  @Get()
  search(@Query() dto: SearchPlacesDto) {
    return this.placeSearch.search(dto.query, dto.limit);
  }

  @Post("plan")
  plan(@Body() dto: CreateRouteDto) {
    return this.builder.build(dto.toQuery());
  }
}
