import { Injectable } from "@nestjs/common";
import type { StyleTag } from "../../common/types/style-tag";
import {
  PlaceRepository,
  type PlaceRow,
} from "../repositories/place.repository";
import type { CandidateQuery, PlaceCandidate, TagPercents } from "./types";

export type PlaceView = {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  visitMinutes: number;
  enterable: boolean;
  imageUrl: string | null;
};

const DEFAULT_PLACE_LIMIT = 8;

const DWELL_MINUTES: Partial<Record<StyleTag, number>> = {
  zoo: 90,
  museum: 45,
  castle: 40,
  palace: 30,
  cathedral: 25,
  hospital: 5,
  park: 20,
  garden: 20,
  church: 15,
  synagogue: 15,
  town_hall: 15,
  university: 15,
  tower: 15,
  fortification: 15,
  cemetery: 15,
  theatre: 10,
  opera: 10,
  library: 10,
  viewpoint: 10,
  bunker: 10,
  square: 8,
  ruins: 8,
  bridge: 5,
  monument: 5,
  tenement: 5,
  villa: 5,
  fountain: 4,
  sculpture: 3,
  street_art: 3,
  mural: 3,
  shrine: 3,
};

const ENTERABLE: StyleTag[] = [
  "zoo",
  "museum",
  "castle",
  "palace",
  "cathedral",
  "church",
  "synagogue",
  "town_hall",
  "university",
  "tower",
  "theatre",
  "opera",
  "library",
  "bunker",
];

const DEFAULT_DWELL_MINUTES = 8;
const MIN_DWELL_MINUTES = 2;
const SIGNIFICANCE_BONUS = 0.5;
const DOMINANT_TAG_MIN_PERCENT = 50;

export function isEnterable(tags: TagPercents): boolean {
  return ENTERABLE.some((tag) => (tags[tag] ?? 0) >= DOMINANT_TAG_MIN_PERCENT);
}

export function visitMinutes(tags: TagPercents, significance: number): number {
  let base = 0;
  let strongest = 0;
  for (const [tag, percent] of Object.entries(tags) as [StyleTag, number][]) {
    const minutes = DWELL_MINUTES[tag];
    if (minutes === undefined || percent < DOMINANT_TAG_MIN_PERCENT) continue;
    if (percent > strongest || (percent === strongest && minutes > base)) {
      strongest = percent;
      base = minutes;
    }
  }
  const minutes =
    (base || DEFAULT_DWELL_MINUTES) *
    (1 + (significance / 100) * SIGNIFICANCE_BONUS);
  return Math.max(MIN_DWELL_MINUTES, Math.round(minutes));
}

@Injectable()
export class PlaceService {
  constructor(private readonly places: PlaceRepository) {}

  async search(
    query: string,
    limit: number = DEFAULT_PLACE_LIMIT,
  ): Promise<PlaceView[]> {
    const found = await this.places.findByName(query.trim(), limit);
    return found.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      lat: p.latitude,
      lng: p.longitude,
      visitMinutes: visitMinutes(p.tags, p.significance),
      enterable: isEnterable(p.tags),
      imageUrl: p.mainImageUrl,
    }));
  }

  async findCandidates(query: CandidateQuery): Promise<PlaceCandidate[]> {
    const rows = await this.places.findInBoxWithTags(query);
    return rows.map((p: PlaceRow) => ({
      id: p.id,
      name: p.name,
      latitude: p.latitude,
      longitude: p.longitude,
      description: p.description,
      mainImageUrl: p.mainImageUrl,
      significance: p.significance,
      tags: p.tags,
      wheelchair: p.facts.wheelchair ?? null,
      openingHours: p.facts.openingHours ?? null,
      visitMinutes: visitMinutes(p.tags, p.significance),
      enterable: isEnterable(p.tags),
    }));
  }
}
