import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "./decorators";
import { RolesGuard } from "./roles.guard";

function setup(required: Role[] | undefined, userRole?: Role) {
  const reflector = {
    getAllAndOverride: () => required,
  } as unknown as Reflector;
  const ctx = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({
        user: userRole ? { sub: "u1", role: userRole } : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
  return { guard: new RolesGuard(reflector), ctx };
}

describe("RolesGuard", () => {
  it("allows routes without required roles", () => {
    const { guard, ctx } = setup(undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("allows a user with a matching role", () => {
    const { guard, ctx } = setup(["admin"], "admin");
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("forbids a user with another role", () => {
    const { guard, ctx } = setup(["admin"], "user");
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
