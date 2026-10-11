import { apiFetch } from "@/shared/api";
import type { Session } from "@/shared/auth";

export class AuthError extends Error {}

const MESSAGES: Record<number, string> = {
  400: "Sprawdź dane: hasło musi mieć co najmniej 8 znaków.",
  401: "Nieprawidłowy e-mail lub hasło.",
  409: "Konto z tym adresem e-mail już istnieje.",
};

async function authenticate(
  path: "/auth/login" | "/auth/register",
  body: Record<string, string>,
): Promise<Session> {
  let res: Response;
  try {
    res = await apiFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthError("Brak połączenia z serwerem.");
  }
  if (!res.ok) {
    throw new AuthError(
      MESSAGES[res.status] ?? "Nie udało się zalogować. Spróbuj ponownie.",
    );
  }
  return res.json();
}

export function login(email: string, password: string): Promise<Session> {
  return authenticate("/auth/login", { email, password });
}

export function register(
  name: string,
  email: string,
  password: string,
): Promise<Session> {
  return authenticate("/auth/register", { name, email, password });
}
