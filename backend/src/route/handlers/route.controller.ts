import { Body, Controller, Post } from "@nestjs/common";
import { RouteBuilderService } from "../services/route-builder.service";
import { CreateRouteDto } from "./dto/create-route.dto";

@Controller("routes")
export class RouteController {
  constructor(private readonly builder: RouteBuilderService) {}

  @Post()
  create(@Body() dto: CreateRouteDto) {
    return this.builder.build(dto.toQuery());
  }
}
