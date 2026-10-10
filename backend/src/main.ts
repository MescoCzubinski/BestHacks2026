import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const http = new Logger("HTTP");
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl === "/api/health") return next();
    const start = Date.now();
    res.on("finish", () =>
      http.log(
        `${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`,
      ),
    );
    next();
  });

  app.use(helmet());
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(",") ?? false });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 8000);
  await app.listen(port, "0.0.0.0");
  new Logger("Bootstrap").log(
    `API listening on :${port} (health: /api/health)`,
  );
}
bootstrap();
