import { API_URL } from "@/shared/config";

export const apiFetch = (path: string, init?: RequestInit) =>
  fetch(`${API_URL}${path}`, init);
