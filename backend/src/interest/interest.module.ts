import { Module } from "@nestjs/common";
import { PlacesModule } from "../places/places.module";
import { InterestController } from "./handlers/interest.controller";
import { InterestCatalogService } from "./services/interest-catalog.service";

@Module({
  imports: [PlacesModule],
  controllers: [InterestController],
  providers: [InterestCatalogService],
})
export class InterestModule {}
