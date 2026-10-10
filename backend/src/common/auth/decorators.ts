import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import type { Request } from "express";

export type Role = "user" | "admin";

export interface AuthUser {
  sub: string;
  role: Role;
}

export type AuthRequest = Request & { user?: AuthUser };

export const IS_PUBLIC_KEY = "isPublic";
export const ROLES_KEY = "roles";

/** Skip the JWT check for this route. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Require one of the given roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Injects the verified JWT claims. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<AuthRequest>().user,
);
