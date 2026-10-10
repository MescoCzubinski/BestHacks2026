import { apiFetch } from "@/shared/api";

export type Location = {
  label: string;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string;
  lat: number;
  lng: number;
};

export async function searchLocations(
  query: string,
  signal?: AbortSignal,
): Promise<Location[]> {
  const res = await apiFetch(`/locations?query=${encodeURIComponent(query)}`, {
    signal,
  });
  if (!res.ok) throw new Error(`Locations request failed: ${res.status}`);
  return res.json();
}
