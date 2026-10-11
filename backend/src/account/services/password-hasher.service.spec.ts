import { PasswordHasher } from "./password-hasher.service";

const hasher = new PasswordHasher();

describe("PasswordHasher", () => {
  it("verifies the password it hashed and rejects another one", async () => {
    const stored = await hasher.hash("correct horse");
    expect(await hasher.verify("correct horse", stored)).toBe(true);
    expect(await hasher.verify("wrong horse", stored)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hasher.hash("same")).not.toBe(await hasher.hash("same"));
  });

  it("never stores the password itself", async () => {
    expect(await hasher.hash("hunter2hunter2")).not.toContain("hunter2");
  });

  it("rejects a stored value it cannot read", async () => {
    expect(await hasher.verify("x", "plaintext")).toBe(false);
    expect(await hasher.verify("x", "bcrypt:a:b")).toBe(false);
  });
});
