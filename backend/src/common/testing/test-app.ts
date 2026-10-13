import type { ModuleMetadata } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test, type TestingModuleBuilder } from "@nestjs/testing";
import { configureApp } from "../app-setup";
import { BusModule } from "../bus/bus.module";
import { DbModule } from "../db/db.module";
import { DomainExceptionFilter } from "../errors/domain-exception.filter";

type Options = {
  imports: ModuleMetadata["imports"];
  databaseUrl?: string;
  env?: Record<string, string>;
  override?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
};

export async function createTestApp({
  imports = [],
  databaseUrl,
  env = {},
  override = (b) => b,
}: Options): Promise<NestExpressApplication> {
  const config = { ...env, ...(databaseUrl && { DATABASE_URL: databaseUrl }) };
  const builder = Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        ignoreEnvVars: true,
        load: [() => config],
      }),
      BusModule,
      ...(databaseUrl ? [DbModule] : []),
      ...imports,
    ],
    providers: [{ provide: APP_FILTER, useClass: DomainExceptionFilter }],
  });
  const moduleRef = await override(builder).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: false,
  });
  configureApp(app);
  await app.init();
  return app;
}
