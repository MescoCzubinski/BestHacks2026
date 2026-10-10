import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./common/auth/auth.module";
import { DbModule } from "./common/db/db.module";
import { validateEnv } from "./common/env";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DbModule,
    AuthModule,
    HealthModule,
  ],
})
export class AppModule {}
