import { Injectable } from "@nestjs/common";
import type { PlaceCandidate } from "./place-candidate";
import { PlaceCandidateService } from "./place-candidate.service";
import type { Accessibility, RouteCandidate } from "./route-candidate";
import type { RouteQuery } from "./route-planner";
import {
  DEFAULT_WALKING_SPEED_KMH,
  DETOUR_FACTOR,
  WalkingEstimateService,
} from "./walking-estimate.service";

const MIN_TAG_PERCENT = 50;
const MAX_CANDIDATES = 120;
const QUERY_LIMIT = 600;
const KM_PER_DEGREE = 111.2;
const BASE_SIGNIFICANCE = 0.5;
const ACCESSIBILITY_BOOST: Record<Accessibility, number> = {
  yes: 1.3,
  limited: 1.1,
  unknown: 0.9,
};

@Injectable()
export class CandidateSelectionService {
  constructor(
    private readonly places: PlaceCandidateService,
    private readonly walking: WalkingEstimateService,
  ) {}

  async select(query: RouteQuery): Promise<RouteCandidate[]> {
    if (query.tags.length === 0) return [];
    const box = this.reachableBox(query);
    const found = await this.places.find({
      ...box,
      tags: query.tags,
      minPercent: MIN_TAG_PERCENT,
      limit: QUERY_LIMIT,
    });
    return found
      .map((p) => this.toCandidate(p, query))
      .filter((c): c is RouteCandidate => c !== null)
      .filter((c) => this.detourFits(c, query))
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

    const wheelchair = p.wheelchair;
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
      dwellMinutes: p.visitMinutes,
      openingHours: p.openingHours,
      accessibility,
    };
  }

  private detourFits(c: RouteCandidate, query: RouteQuery): boolean {
    const there = this.walking.minutes(query.start, c.point);
    const back = this.walking.minutes(c.point, query.end);
    return there + c.dwellMinutes + back <= query.durationMinutes;
  }

  private reachableBox(query: RouteQuery) {
    const walkKm =
      ((query.durationMinutes / 60) * DEFAULT_WALKING_SPEED_KMH) /
      DETOUR_FACTOR;
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
}
