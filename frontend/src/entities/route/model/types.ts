export type RoutePoint = { lat: number; lng: number };

export type RouteStop = {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  visitMinutes: number;
};

export type WalkingPath = {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: RoutePoint[];
};

export type BuiltRoute = {
  stops: RouteStop[];
  path: WalkingPath;
};
