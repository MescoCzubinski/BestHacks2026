import { Controller, Get, Query } from "@nestjs/common";
import { PathFinderService } from "../services/path-finder.service";
import { FindPathDto } from "./dto/find-path.dto";

@Controller("directions")
export class DirectionsController {
  constructor(private readonly pathFinder: PathFinderService) {}

  @Get()
  find(@Query() dto: FindPathDto) {
    return this.pathFinder.find(dto.toPoints());
  }
}
