import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";

const TRUSTED_PROXY_HOPS = 1; // the ingress (or the Vite dev proxy) in front of the API

export function configureApp(app: NestExpressApplication): void {
  app.set("trust proxy", TRUSTED_PROXY_HOPS);
  app.use(helmet());
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
