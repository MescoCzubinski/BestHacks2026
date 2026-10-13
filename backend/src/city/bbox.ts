import type { Bbox } from "../common/types/geo";

export function bboxContains(bbox: Bbox, lat: number, lng: number): boolean {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}
