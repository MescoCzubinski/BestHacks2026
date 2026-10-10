import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";
import { AuthModule } from "./common/auth/auth.module";
import { DbModule } from "./common/db/db.module";
import { SeedModule } from "./common/db/seed/seed.module";
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
    DbModule,
    AuthModule,
    CityModule,
    PathModule,
    RouteModule,
    TagModule,
    SeedModule,
    HealthModule,
    PlacesModule,
    SeedModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: DomainExceptionFilter }],
})
export class AppModule {}
