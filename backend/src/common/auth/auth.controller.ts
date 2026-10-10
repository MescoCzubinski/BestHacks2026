import { Controller, Get } from "@nestjs/common";
import { AuthUser, CurrentUser } from "./decorators";

@Controller("auth")
export class AuthController {
  /** Returns the claims of the current token (example of a protected route). */
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
