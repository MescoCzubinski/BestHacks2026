import { apiFetch } from "@/shared/api";

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await apiFetch("/health");
    return res.ok;
  } catch {
    return false;
  }
}
