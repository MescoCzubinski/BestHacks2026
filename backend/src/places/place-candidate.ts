import type { PlaceFacts, PositionQuality } from "./place-facts";
import type { StyleTag } from "./style-tag";

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
  south: number;
  west: number;
  north: number;
  east: number;
  tags: StyleTag[];
  minPercent: number;
  limit: number;
};

export type TagCount = { tag: StyleTag; count: number };
