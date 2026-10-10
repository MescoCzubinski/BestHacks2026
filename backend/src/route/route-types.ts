import type { PlaceCandidate } from "../places/place-candidate";
import type { StyleTag } from "../places/style-tag";
import type { GeoPoint } from "../path/path-types";

export type Interest = { tag: StyleTag; weight: number };

export type PlanPreferences = {
  /** Skip places known to be inaccessible and prefer ones known to be accessible. */
  accessible: boolean;
  /** Only places tagged as free to enter. */
  freeOnly: boolean;
  maxStops: number;
  walkingSpeedKmh: number;
};

export type PlanRequest = {
  start: GeoPoint;
  end: GeoPoint;
  startAt: Date;
  availableMinutes: number;
  interests: Interest[];
  preferences: PlanPreferences;
};

export type Accessibility = "yes" | "limited" | "unknown";

/** A place the planner may visit, with everything it needs already decided. */
export type RouteCandidate = {
  place: PlaceCandidate;
  point: GeoPoint;
  /** How much a visit is worth: relevance to the chosen interests times how notable the place is. */
  value: number;
  dwellMinutes: number;
  openingHours: string | null;
  accessibility: Accessibility;
};

export type PlannedStop = {
  candidate: RouteCandidate;
  arriveAt: Date;
  departAt: Date;
  walkMinutes: number;
};

export type Plan = {
  stops: PlannedStop[];
  endAt: Date;
  totalMinutes: number;
  walkMinutes: number;
  visitMinutes: number;
  value: number;
};
