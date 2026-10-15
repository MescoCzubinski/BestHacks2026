import type { StyleTag } from "../../common/types/style-tag";
import type { LatLng } from "./geo";

export type TagPercents = Partial<Record<StyleTag, number>>;

export type CandidateQuery = {
  south: number;
  west: number;
  north: number;
  east: number;
  tags: StyleTag[];
  minPercent: number;
  limit: number;
};

export type PlaceCandidate = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description: string | null;
  mainImageUrl: string | null;
  significance: number;
  tags: TagPercents;
  openingHours: string | null;
  visitMinutes: number;
  enterable: boolean;
};

export type RouteQuery = {
  start: LatLng;
  end: LatLng;
  durationMinutes: number;
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

export type RouteCandidate = {
  place: PlaceCandidate;
  point: LatLng;
  value: number;
  dwellMinutes: number;
  openingHours: string | null;
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
