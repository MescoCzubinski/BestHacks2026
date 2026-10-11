import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { AuthUser, CurrentUser, Public } from "../../common/auth/decorators";
import { AccountService } from "../services/account.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly accounts: AccountService) {}

  @Public()
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.accounts.register(dto);
  }

  @Public()
  @Post("login")
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.accounts.login(dto.email, dto.password);
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.accounts.profile(user.sub);
  }
}
