import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { DEFAULT_REQUESTS_PER_WINDOW, RATE_WINDOW_MS } from "./rate-limit";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: RATE_WINDOW_MS,
        limit: DEFAULT_REQUESTS_PER_WINDOW,
      },
    ]),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class RateLimitModule {}
