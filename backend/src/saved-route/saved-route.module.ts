import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CityModule } from "../city/city.module";
import { TagModule } from "../tag/tag.module";
import { SavedRoute } from "./entities/saved-route.entity";
import { SavedRouteController } from "./handlers/saved-route.controller";
import { SavedRouteQueryService } from "./services/saved-route-query.service";
import { SavedRouteWriterService } from "./services/saved-route-writer.service";

@Module({
  imports: [TypeOrmModule.forFeature([SavedRoute]), CityModule, TagModule],
  controllers: [SavedRouteController],
  providers: [SavedRouteQueryService, SavedRouteWriterService],
})
export class SavedRouteModule {}
