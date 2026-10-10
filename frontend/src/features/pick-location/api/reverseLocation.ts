import { apiFetch } from "@/shared/api";
import type { Location } from "./searchLocations";

export type ReverseResult = {
  location: Location;
  supported: boolean;
  supportedCities: string[];
};

export async function reverseLocation(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<ReverseResult> {
  const res = await apiFetch(`/locations/reverse?lat=${lat}&lng=${lng}`, {
    signal,
  });
  if (!res.ok) throw new Error(`Reverse lookup failed: ${res.status}`);
  return res.json();
}
