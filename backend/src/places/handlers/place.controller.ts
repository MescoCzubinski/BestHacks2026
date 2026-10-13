import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { PlaceService } from "../services/place.service";
import { PlanService } from "../services/plan.service";
import { CreateRouteDto } from "./dto/create-route.dto";
import { SearchPlacesDto } from "./dto/search-places.dto";

@Controller("places")
export class PlaceController {
  constructor(
    private readonly places: PlaceService,
    private readonly plans: PlanService,
  ) {}

  @Get()
  search(@Query() dto: SearchPlacesDto) {
    return this.places.search(dto.query, dto.limit);
  }

  @Post("plan")
  plan(@Body() dto: CreateRouteDto) {
    return this.plans.build(dto.toQuery());
  }
}
