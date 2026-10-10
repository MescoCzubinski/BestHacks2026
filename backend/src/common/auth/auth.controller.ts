import { Controller, Get } from "@nestjs/common";
import { AuthUser, CurrentUser } from "./decorators";

@Controller("auth")
export class AuthController {
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
