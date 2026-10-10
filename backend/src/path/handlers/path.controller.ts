import { Body, Controller, Post } from "@nestjs/common";
import { Public } from "../../common/auth/decorators";
import { PathService } from "../services/path.service";
import { ComputePathDto } from "./dto/compute-path.dto";

@Controller("paths")
export class PathController {
  constructor(private readonly paths: PathService) {}

  /** Walking legs (geometry, distance, time) through the given points, in order. */
  @Public()
  @Post()
  compute(@Body() dto: ComputePathDto) {
    return this.paths.compute(dto.points, {
      walkingSpeedKmh: dto.walkingSpeedKmh,
    });
  }
}
