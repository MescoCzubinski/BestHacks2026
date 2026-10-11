import type { Repository } from "typeorm";
import { NotFoundDomainException } from "../../common/errors/domain.exception";
import type { User } from "../entities/user.entity";
import { EmailTakenException } from "../exceptions/email-taken.exception";
import { InvalidCredentialsException } from "../exceptions/invalid-credentials.exception";
import { AccountService } from "./account.service";
import { PasswordHasher } from "./password-hasher.service";
import type { SessionTokenService } from "./session-token.service";

const hasher = new PasswordHasher();

function setup(existing: User[] = []) {
  const rows = [...existing];
  const users = {
    existsBy: jest.fn(async ({ email }: { email: string }) =>
      rows.some((u) => u.email === email),
    ),
    findOneBy: jest.fn(
      async (where: Partial<User>) =>
        rows.find(
          (u) =>
            (where.email === undefined || u.email === where.email) &&
            (where.id === undefined || u.id === where.id),
        ) ?? null,
    ),
    create: jest.fn((u: Partial<User>) => u as User),
    save: jest.fn(async (u: User) => {
      const saved = { ...u, id: `u${rows.length + 1}` } as User;
      rows.push(saved);
      return saved;
    }),
  };
  const tokens = {
    issue: jest.fn(async (u: User) => `token-for-${u.id}`),
  } as unknown as SessionTokenService;
  const service = new AccountService(
    users as unknown as Repository<User>,
    hasher,
    tokens,
  );
  return { service, users };
}

async function user(email: string, password: string): Promise<User> {
  return {
    id: "u0",
    email,
    name: "Anna",
    role: "user",
    passwordHash: await hasher.hash(password),
  } as User;
}

describe("AccountService", () => {
  it("registers an account with a normalised e-mail and a hashed password", async () => {
    const { service, users } = setup();
    const session = await service.register({
      name: " Anna ",
      email: " Anna@Atlas.PL ",
      password: "demo1234",
    });
    expect(session.token).toBe("token-for-u1");
    expect(session.user).toEqual({
      id: "u1",
      email: "anna@atlas.pl",
      name: "Anna",
      role: "user",
    });
    const stored = users.create.mock.calls[0][0] as User;
    expect(stored.passwordHash).not.toContain("demo1234");
  });

  it("refuses a second account with the same e-mail", async () => {
    const { service } = setup([await user("anna@atlas.pl", "demo1234")]);
    await expect(
      service.register({
        name: "Other",
        email: "ANNA@atlas.pl",
        password: "another-pass",
      }),
    ).rejects.toThrow(EmailTakenException);
  });

  it("logs in with the right password", async () => {
    const { service } = setup([await user("anna@atlas.pl", "demo1234")]);
    const session = await service.login("Anna@atlas.pl", "demo1234");
    expect(session.token).toBe("token-for-u0");
    expect(session.user.email).toBe("anna@atlas.pl");
  });

  it("rejects a wrong password and an unknown e-mail the same way", async () => {
    const { service } = setup([await user("anna@atlas.pl", "demo1234")]);
    await expect(service.login("anna@atlas.pl", "nope-nope")).rejects.toThrow(
      InvalidCredentialsException,
    );
    await expect(service.login("who@atlas.pl", "demo1234")).rejects.toThrow(
      InvalidCredentialsException,
    );
  });

  it("returns the profile of the signed-in user, without the hash", async () => {
    const { service } = setup([await user("anna@atlas.pl", "demo1234")]);
    expect(await service.profile("u0")).toEqual({
      id: "u0",
      email: "anna@atlas.pl",
      name: "Anna",
      role: "user",
    });
    await expect(service.profile("missing")).rejects.toThrow(
      NotFoundDomainException,
    );
  });
});
