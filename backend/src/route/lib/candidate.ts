import type { LatLng } from "../../city/bbox";
import type { PlaceCandidate } from "../../places/place-candidate";

export type Accessibility = "yes" | "limited" | "unknown";

/** A place the planner may visit, with everything it needs already decided. */
export type RouteCandidate = {
  place: PlaceCandidate;
  point: LatLng;
  /** How much a visit is worth: relevance to the chosen tags times how notable the place is. */
  value: number;
  dwellMinutes: number;
  openingHours: string | null;
  accessibility: Accessibility;
};

export type TimelineStop = {
  candidate: RouteCandidate;
  arriveAt: Date;
  departAt: Date;
  walkMinutes: number;
};

export type Plan = {
  stops: TimelineStop[];
  endAt: Date;
  totalMinutes: number;
  walkMinutes: number;
  visitMinutes: number;
  value: number;
};
