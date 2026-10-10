import type { LatLng } from "../../city/bbox";
import type { StyleTag } from "../../places/style-tag";

export type RouteQuery = {
  start: LatLng;
  end: LatLng;
  durationMinutes: number;
  wheelchair: boolean;
  tags: StyleTag[];
};

export type PlannedStop = {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  visitMinutes: number;
};

/** Chooses and orders the stops of a route; the walking path between them is found separately. */
export abstract class RoutePlanner {
  abstract plan(query: RouteQuery): Promise<PlannedStop[]>;
}
