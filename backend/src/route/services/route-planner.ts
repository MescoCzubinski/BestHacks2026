import type { LatLng } from "../../city/bbox";
import type { StyleTag } from "../../places/style-tag";

export type RouteQuery = {
  start: LatLng;
  end: LatLng;
  durationMinutes: number;
  wheelchair: boolean;
  tags: StyleTag[];
  /** When the walk begins, for opening hours; defaults to now. */
  startTime?: Date;
};

export type PlannedStop = {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  /** Typical time at this kind of place; the user may change it. */
  visitMinutes: number;
  /** Whether visitors can go inside (museum, church…), so the user can set a longer visit. */
  enterable: boolean;
  /** ISO time we expect to arrive, when the planner knows it. */
  arriveAt?: string;
  imageUrl?: string | null;
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
