export type GeoPoint = { lat: number; lon: number };

/** One walked segment between two consecutive points. `geometry` is [lon, lat] pairs (GeoJSON order). */
export type PathLeg = {
  from: GeoPoint;
  to: GeoPoint;
  distanceM: number;
  durationS: number;
  geometry: [number, number][];
  /** "graphhopper" for a real pedestrian route, "estimate" for a straight line with a detour factor. */
  source: "graphhopper" | "estimate";
};

export type PathResult = {
  legs: PathLeg[];
  distanceM: number;
  durationS: number;
};
