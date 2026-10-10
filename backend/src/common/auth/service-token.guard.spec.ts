import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { ServiceTokenGuard } from "./service-token.guard";

function context(authorization?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization } }),
    }),
  } as unknown as ExecutionContext;
}

function guard(token?: string) {
  const config = { get: () => token } as unknown as ConfigService;
  return new ServiceTokenGuard(config);
}

describe("ServiceTokenGuard", () => {
  it("accepts the configured bearer token", () => {
    expect(guard("secret").canActivate(context("Bearer secret"))).toBe(true);
  });

  it("rejects a wrong, missing or malformed token", () => {
    expect(() => guard("secret").canActivate(context("Bearer nope"))).toThrow(
      UnauthorizedException,
    );
    expect(() => guard("secret").canActivate(context())).toThrow(
      UnauthorizedException,
    );
    expect(() => guard("secret").canActivate(context("secret"))).toThrow(
      UnauthorizedException,
    );
  });

  it("keeps the endpoint closed when no token is configured", () => {
    expect(() => guard(undefined).canActivate(context("Bearer "))).toThrow(
      UnauthorizedException,
    );
    expect(() => guard("").canActivate(context("Bearer x"))).toThrow(
      UnauthorizedException,
    );
  });
});
