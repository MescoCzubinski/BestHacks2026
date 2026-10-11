import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotFoundDomainException } from "../../common/errors/domain.exception";
import { User } from "../entities/user.entity";
import { EmailTakenException } from "../exceptions/email-taken.exception";
import { InvalidCredentialsException } from "../exceptions/invalid-credentials.exception";
import { PasswordHasher } from "./password-hasher.service";
import { SessionTokenService } from "./session-token.service";

export type AccountView = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type Session = { token: string; user: AccountView };

export type Registration = { name: string; email: string; password: string };

const normaliseEmail = (email: string) => email.trim().toLowerCase();

const view = (u: User): AccountView => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
});

@Injectable()
export class AccountService {
  private readonly log = new Logger(AccountService.name);
  private decoyHash?: Promise<string>;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly hasher: PasswordHasher,
    private readonly tokens: SessionTokenService,
  ) {}

  async register(input: Registration): Promise<Session> {
    const email = normaliseEmail(input.email);
    if (await this.users.existsBy({ email })) throw new EmailTakenException();
    const user = await this.users.save(
      this.users.create({
        email,
        name: input.name.trim(),
        passwordHash: await this.hasher.hash(input.password),
        role: "user",
      }),
    );
    this.log.log(`registered ${user.id}`);
    return { token: await this.tokens.issue(user), user: view(user) };
  }

  async login(emailInput: string, password: string): Promise<Session> {
    const user = await this.users.findOneBy({
      email: normaliseEmail(emailInput),
    });
    const stored = user?.passwordHash ?? (await this.decoy());
    const ok = await this.hasher.verify(password, stored);
    if (!user || !ok) throw new InvalidCredentialsException();
    return { token: await this.tokens.issue(user), user: view(user) };
  }

  async profile(userId: string): Promise<AccountView> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundDomainException("Account", userId);
    return view(user);
  }

  private decoy(): Promise<string> {
    this.decoyHash ??= this.hasher.hash("not-a-real-password");
    return this.decoyHash;
  }
}
