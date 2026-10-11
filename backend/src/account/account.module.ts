import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../common/auth/auth.module";
import { User } from "./entities/user.entity";
import { AuthController } from "./handlers/auth.controller";
import { AccountService } from "./services/account.service";
import { PasswordHasher } from "./services/password-hasher.service";
import { SessionTokenService } from "./services/session-token.service";

@Module({
  imports: [TypeOrmModule.forFeature([User]), AuthModule],
  controllers: [AuthController],
  providers: [AccountService, PasswordHasher, SessionTokenService],
  exports: [PasswordHasher],
})
export class AccountModule {}
