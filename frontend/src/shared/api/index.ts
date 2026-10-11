import { clearSession, getSession } from "@/shared/auth";
import { API_URL } from "@/shared/config";

const PUBLIC_PATHS = ["/auth/login", "/auth/register", "/health"];

/**
 * fetch against the API with the signed-in user's token. A 401 on a protected path
 * means the session ended, so it is cleared and the app goes back to the login page.
 */
export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  const token = getSession()?.token;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401 && !PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    clearSession();
    if (typeof window !== "undefined") window.location.hash = "#/login";
  }
  return res;
}
