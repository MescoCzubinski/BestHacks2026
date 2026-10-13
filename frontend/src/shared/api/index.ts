import { API_URL } from "@/shared/config";

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, init);
}
