type LatLng = { lat: number; lng: number };

export type RequestContract = { payload: unknown; reply: unknown };

export type RoutedPath = {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: LatLng[];
};

export type Requests = {
  "location.ensure-inside": { payload: { points: LatLng[] }; reply: void };
  "directions.route": { payload: { points: LatLng[] }; reply: RoutedPath };
};

export type Events = Record<never, unknown>;
