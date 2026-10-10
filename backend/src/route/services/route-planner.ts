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
  /** Typical visit: 5–15 min for a look from outside, the average visit time for places that can be entered. */
  visitMinutes: number;
  /** Whether visitors can go inside (museum, church…), so the user can set a longer visit. */
  enterable: boolean;
};

export type PlannedRoute = {
  stops: PlannedStop[];
  /** Matching places that did not fit the time budget; the user may swap them in. */
  extras: PlannedStop[];
};

/** Chooses and orders the stops of a route; the walking path between them is found separately. */
export abstract class RoutePlanner {
  abstract plan(query: RouteQuery): Promise<PlannedRoute>;
}
