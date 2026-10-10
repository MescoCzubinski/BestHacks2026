import { Body, Controller, Post } from "@nestjs/common";
import { Public } from "../../common/auth/decorators";
import { RouteBuilderService } from "../services/route-builder.service";
import { CreateRouteDto } from "./dto/create-route.dto";

@Public()
@Controller("routes")
export class RouteController {
  constructor(private readonly builder: RouteBuilderService) {}

  @Post()
  create(@Body() dto: CreateRouteDto) {
    return this.builder.build(dto.toQuery());
  }
}
