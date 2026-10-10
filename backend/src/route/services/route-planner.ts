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
  visitMinutes: number;
  /** ISO time we expect to arrive, when the planner knows it. */
  arriveAt?: string;
  imageUrl?: string | null;
};

/** Chooses and orders the stops of a route; the walking path between them is found separately. */
export abstract class RoutePlanner {
  abstract plan(query: RouteQuery): Promise<PlannedStop[]>;
}
