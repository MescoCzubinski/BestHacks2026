export type Bbox = [number, number, number, number];

export function bboxContains(bbox: Bbox, lat: number, lng: number): boolean {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

export type LatLng = { lat: number; lng: number };
