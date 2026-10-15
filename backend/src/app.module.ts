import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";
import { BusModule } from "./common/bus/bus.module";
import { DbModule } from "./common/db/db.module";
import { DomainExceptionFilter } from "./common/errors/domain-exception.filter";
import { validateEnv } from "./common/env";
import { HealthModule } from "./health/health.module";
import { DirectionsModule } from "./directions/directions.module";
import { LocationModule } from "./location/location.module";
import { TagModule } from "./tag/tag.module";
import { PlacesModule } from "./places/places.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    BusModule,
    DbModule,
    LocationModule,
    DirectionsModule,
    TagModule,
    HealthModule,
    PlacesModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: DomainExceptionFilter }],
})
export class AppModule {}
