import type { LatLng } from "../../common/types/geo";
import type { StyleTag } from "../../common/types/style-tag";

export type RouteQuery = {
  start: LatLng;
  end: LatLng;
  durationMinutes: number;
  wheelchair: boolean;
  tags: StyleTag[];
  startTime?: Date;
};

export type PlannedStop = {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  visitMinutes: number;
  enterable: boolean;
  arriveAt?: string;
  imageUrl?: string | null;
};

export type PlannedRoute = {
  stops: PlannedStop[];
  extras: PlannedStop[];
};

export abstract class RoutePlanner {
  abstract plan(query: RouteQuery): Promise<PlannedRoute>;
}
