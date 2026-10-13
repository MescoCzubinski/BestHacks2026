import { RequestMethod, ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";

const INTERNAL_EMBEDDINGS = {
  path: "internal/embeddings",
  method: RequestMethod.POST,
};

export function configureApp(app: NestExpressApplication): void {
  app.use(helmet());
  app.setGlobalPrefix("api", { exclude: [INTERNAL_EMBEDDINGS] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
