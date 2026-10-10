import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { City } from "../../../city/entities/city.entity";
import { SeedService } from "./seed.service";

@Module({
  imports: [TypeOrmModule.forFeature([City])],
  providers: [SeedService],
})
export class SeedModule {}
