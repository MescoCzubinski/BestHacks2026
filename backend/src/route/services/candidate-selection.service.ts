import { Injectable } from "@nestjs/common";
import type { PlaceCandidate } from "../../places/place-candidate";
import { PlaceQueryService } from "../../places/services/place-query.service";
import type { Accessibility, RouteCandidate } from "../lib/candidate";
import { visitMinutes } from "../lib/visit-duration";
import {
  DEFAULT_WALKING_SPEED_KMH,
  DETOUR_FACTOR,
  estimateWalkMinutes,
} from "../lib/walking-estimate";
import type { RouteQuery } from "./route-planner";

const MIN_TAG_PERCENT = 50; // below this a place is not "about" the tag
const MAX_CANDIDATES = 120; // enough choice for the planner, small enough to stay fast
const QUERY_LIMIT = 600;
const KM_PER_DEGREE = 111.2;
const BASE_SIGNIFICANCE = 0.5; // a place nobody wrote about still counts half; fame adds up to +0.5
const ACCESSIBILITY_BOOST: Record<Accessibility, number> = {
  yes: 1.3,
  limited: 1.1,
  unknown: 0.9,
};

/** Which places can be on this route and how much each one is worth. */
@Injectable()
export class CandidateSelectionService {
  constructor(private readonly places: PlaceQueryService) {}

  async select(query: RouteQuery): Promise<RouteCandidate[]> {
    if (query.tags.length === 0) return [];
    const box = reachableBox(query);
    const found = await this.places.findCandidates({
      ...box,
      tags: query.tags,
      minPercent: MIN_TAG_PERCENT,
      limit: QUERY_LIMIT,
    });
    return found
      .map((p) => this.toCandidate(p, query))
      .filter((c): c is RouteCandidate => c !== null)
      .filter((c) => detourFits(c, query))
      .sort((a, b) => b.value - a.value)
      .slice(0, MAX_CANDIDATES);
  }

  private toCandidate(
    p: PlaceCandidate,
    query: RouteQuery,
  ): RouteCandidate | null {
    let relevance = 0;
    for (const tag of query.tags) {
      const percent = p.tags[tag] ?? 0;
      if (percent >= MIN_TAG_PERCENT)
        relevance = Math.max(relevance, percent / 100);
    }
    if (relevance === 0) return null;

    const wheelchair = p.facts.wheelchair;
    if (query.wheelchair && wheelchair === "no") return null;
    const accessibility: Accessibility =
      wheelchair === "yes" || wheelchair === "limited" ? wheelchair : "unknown";
    const accessBoost = query.wheelchair
      ? ACCESSIBILITY_BOOST[accessibility]
      : 1;

    const notable = BASE_SIGNIFICANCE + p.significance / 200;
    return {
      place: p,
      point: { lat: p.latitude, lng: p.longitude },
      value: relevance * notable * accessBoost,
      dwellMinutes: visitMinutes(p.tags, p.significance),
      openingHours: p.facts.openingHours ?? null,
      accessibility,
    };
  }
}

/** Every reachable point lies within half the walkable distance of the midpoint between start and end. */
function reachableBox(query: RouteQuery) {
  const walkKm =
    ((query.durationMinutes / 60) * DEFAULT_WALKING_SPEED_KMH) / DETOUR_FACTOR;
  const centre = {
    lat: (query.start.lat + query.end.lat) / 2,
    lng: (query.start.lng + query.end.lng) / 2,
  };
  const dLat = walkKm / 2 / KM_PER_DEGREE;
  const dLng = dLat / Math.cos((centre.lat * Math.PI) / 180);
  return {
    south: centre.lat - dLat,
    north: centre.lat + dLat,
    west: centre.lng - dLng,
    east: centre.lng + dLng,
  };
}

/** Quick test: start -> place -> end plus the visit must fit the budget on its own. */
function detourFits(c: RouteCandidate, query: RouteQuery): boolean {
  const there = estimateWalkMinutes(query.start, c.point);
  const back = estimateWalkMinutes(c.point, query.end);
  return there + c.dwellMinutes + back <= query.durationMinutes;
}
