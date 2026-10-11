import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import { AuthUser, CurrentUser } from "../../common/auth/decorators";
import { SavedRouteQueryService } from "../services/saved-route-query.service";
import { SavedRouteWriterService } from "../services/saved-route-writer.service";
import { CreateSavedRouteDto } from "./dto/create-saved-route.dto";

@Controller("saved-routes")
export class SavedRouteController {
  constructor(
    private readonly query: SavedRouteQueryService,
    private readonly writer: SavedRouteWriterService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.query.listForUser(user.sub);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSavedRouteDto) {
    return this.writer.save(user.sub, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.writer.remove(user.sub, id);
  }
}
