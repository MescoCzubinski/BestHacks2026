import type { StyleTag } from "../../common/types/style-tag";

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
  wheelchair: "yes" | "limited" | "no" | null;
  openingHours: string | null;
  visitMinutes: number;
  enterable: boolean;
};
