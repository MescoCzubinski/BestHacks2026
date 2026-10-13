import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module";
import { configureApp } from "./common/app-setup";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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

  configureApp(app);
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 8000);
  await app.listen(port, "0.0.0.0");
  new Logger("Bootstrap").log(
    `API listening on :${port} (health: /api/health)`,
  );
}
bootstrap();
