import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthError, login, register } from "./auth";

afterEach(() => vi.unstubAllGlobals());

const SESSION = {
  token: "jwt",
  user: { id: "u1", email: "a@b.pl", name: "Anna", role: "user" },
};

describe("login", () => {
  it("posts the credentials and returns the session", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => SESSION });
    vi.stubGlobal("fetch", fetchMock);

    expect(await login("a@b.pl", "secret123")).toEqual(SESSION);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toMatch(/\/auth\/login$/);
    expect(JSON.parse(init.body)).toEqual({
      email: "a@b.pl",
      password: "secret123",
    });
  });

  it("explains wrong credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    );
    await expect(login("a@b.pl", "bad")).rejects.toThrow(
      "Nieprawidłowy e-mail lub hasło.",
    );
  });

  it("reports an unreachable server", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("down")));
    await expect(login("a@b.pl", "x")).rejects.toBeInstanceOf(AuthError);
  });
});

describe("register", () => {
  it("posts name, e-mail and password", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 201, json: async () => SESSION });
    vi.stubGlobal("fetch", fetchMock);

    await register("Anna", "a@b.pl", "secret123");
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toMatch(/\/auth\/register$/);
    expect(JSON.parse(init.body)).toEqual({
      name: "Anna",
      email: "a@b.pl",
      password: "secret123",
    });
  });

  it("explains a taken e-mail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 409 }),
    );
    await expect(register("A", "a@b.pl", "secret123")).rejects.toThrow(
      "już istnieje",
    );
  });
});
