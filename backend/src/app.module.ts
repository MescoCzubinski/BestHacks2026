import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";
import { BusModule } from "./common/bus/bus.module";
import { DbModule } from "./common/db/db.module";
import { SeedModule } from "./common/db/seed/seed.module";
import { RateLimitModule } from "./common/rate-limit/rate-limit.module";
import { DomainExceptionFilter } from "./common/errors/domain-exception.filter";
import { validateEnv } from "./common/env";
import { CityModule } from "./city/city.module";
import { HealthModule } from "./health/health.module";
import { PathModule } from "./path/path.module";
import { RouteModule } from "./route/route.module";
import { TagModule } from "./tag/tag.module";
import { PlacesModule } from "./places/places.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    BusModule,
    DbModule,
    RateLimitModule,
    CityModule,
    PathModule,
    RouteModule,
    TagModule,
    SeedModule,
    HealthModule,
    PlacesModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: DomainExceptionFilter }],
})
export class AppModule {}
