import { Injectable } from "@nestjs/common";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const SCHEME = "scrypt";

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, KEY_BYTES, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}

@Injectable()
export class PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const key = await derive(password, salt);
    return [SCHEME, salt.toString("base64"), key.toString("base64")].join(":");
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const [scheme, salt, key] = stored.split(":");
    if (scheme !== SCHEME || !salt || !key) return false;
    const expected = Buffer.from(key, "base64");
    const actual = await derive(password, Buffer.from(salt, "base64"));
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }
}
