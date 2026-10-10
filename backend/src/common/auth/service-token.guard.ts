import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";

@Injectable()
export class ServiceTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const expected = this.config.get<string>("EMBEDDING_API_TOKEN");
    const header = ctx.switchToHttp().getRequest<Request>()
      .headers.authorization;
    const [type, token] = header?.split(" ") ?? [];
    if (!expected || type !== "Bearer" || !token || !same(token, expected)) {
      throw new UnauthorizedException("Invalid service token");
    }
    return true;
  }
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
