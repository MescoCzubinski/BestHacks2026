import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { AuthUser } from "../../common/auth/decorators";
import type { User } from "../entities/user.entity";

@Injectable()
export class SessionTokenService {
  constructor(private readonly jwt: JwtService) {}

  issue(user: User): Promise<string> {
    const payload: AuthUser = { sub: user.id, role: user.role };
    return this.jwt.signAsync(payload);
  }
}
