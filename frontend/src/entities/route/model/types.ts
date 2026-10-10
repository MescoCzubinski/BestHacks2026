export type RoutePoint = { lat: number; lng: number };

export type RouteStop = {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  visitMinutes: number;
  enterable: boolean;
};

export type WalkingPath = {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: RoutePoint[];
};

export type BuiltRoute = {
  stops: RouteStop[];
  extras: RouteStop[];
  path: WalkingPath;
};
