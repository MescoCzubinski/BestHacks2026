import type { PlaceFacts, PositionQuality } from "./place-facts";
import type { StyleTag } from "./style-tag";

/** A place with its tag scores, as needed by planners and listings (no entity internals). */
export type PlaceCandidate = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description: string | null;
  mainImageUrl: string | null;
  significance: number;
  positionQuality: PositionQuality;
  year: number | null;
  facts: PlaceFacts;
  tags: Partial<Record<StyleTag, number>>;
};

export type CandidateQuery = {
  /** Bounding box in degrees. */
  south: number;
  west: number;
  north: number;
  east: number;
  /** A place qualifies when it has at least one of these tags at or above `minPercent`. */
  tags: StyleTag[];
  minPercent: number;
  limit: number;
};

export type TagCount = { tag: StyleTag; count: number };
