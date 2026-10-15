import { Controller, Get, Query } from "@nestjs/common";
import { DirectionsService } from "../services/directions.service";
import { FindPathDto } from "./dto/find-path.dto";

@Controller("directions")
export class DirectionsController {
  constructor(private readonly directions: DirectionsService) {}

  @Get()
  find(@Query() dto: FindPathDto) {
    return this.directions.find(dto.toPoints());
  }
}
