import { Injectable } from "@nestjs/common";
import type { PlaceCandidate } from "../../places/place-candidate";
import { PlaceQueryService } from "../../places/services/place-query.service";
import { estimateWalkMinutes } from "../../path/services/straight-line";
import type { GeoPoint } from "../../path/path-types";
import type { Accessibility, PlanRequest, RouteCandidate } from "../route-types";
import { visitMinutes } from "./visit-duration";

const MIN_INTEREST_PERCENT = 50; // below this a place is not "about" the tag
const FREE_ENTRY_MIN_PERCENT = 60;
const MAX_CANDIDATES = 120; // enough choice for the planner, small enough to stay fast
const QUERY_LIMIT = 600;
const KM_PER_DEGREE = 111.2;
const BASE_SIGNIFICANCE = 0.5; // a place nobody wrote about still counts half; fame adds up to +0.5
const ACCESSIBILITY_BOOST: Record<Accessibility, number> = { yes: 1.3, limited: 1.1, unknown: 0.9 };

/** Which places can be on this route and how much each one is worth. */
@Injectable()
export class CandidateSelectionService {
  constructor(private readonly places: PlaceQueryService) {}

  async select(req: PlanRequest): Promise<RouteCandidate[]> {
    const { south, west, north, east } = reachableBox(req);
    const found = await this.places.findCandidates({
      south,
      west,
      north,
      east,
      tags: req.interests.map((i) => i.tag),
      minPercent: MIN_INTEREST_PERCENT,
      limit: QUERY_LIMIT,
    });
    return found
      .map((p) => this.toCandidate(p, req))
      .filter((c): c is RouteCandidate => c !== null)
      .filter((c) => detourFits(c, req))
      .sort((a, b) => b.value - a.value)
      .slice(0, MAX_CANDIDATES);
  }

  private toCandidate(p: PlaceCandidate, req: PlanRequest): RouteCandidate | null {
    let relevance = 0;
    for (const { tag, weight } of req.interests) {
      const percent = p.tags[tag] ?? 0;
      if (percent >= MIN_INTEREST_PERCENT) relevance = Math.max(relevance, (percent / 100) * weight);
    }
    if (relevance === 0) return null;
    if (req.preferences.freeOnly && (p.tags.free_entry ?? 0) < FREE_ENTRY_MIN_PERCENT) return null;

    const wheelchair = p.facts.wheelchair;
    if (req.preferences.accessible && wheelchair === "no") return null;
    const accessibility: Accessibility = wheelchair === "yes" || wheelchair === "limited" ? wheelchair : "unknown";
    const accessBoost = req.preferences.accessible ? ACCESSIBILITY_BOOST[accessibility] : 1;

    const notable = BASE_SIGNIFICANCE + p.significance / 200;
    return {
      place: p,
      point: { lat: p.latitude, lon: p.longitude },
      value: relevance * notable * accessBoost,
      dwellMinutes: visitMinutes(p.tags, p.significance),
      openingHours: p.facts.openingHours ?? null,
      accessibility,
    };
  }
}

/** Every reachable point lies within half the walkable distance of the midpoint between start and end. */
function reachableBox(req: PlanRequest) {
  const walkKm = ((req.availableMinutes / 60) * req.preferences.walkingSpeedKmh) / 1.3; // 1.3: detour factor
  const centre = { lat: (req.start.lat + req.end.lat) / 2, lon: (req.start.lon + req.end.lon) / 2 };
  const dLat = walkKm / 2 / KM_PER_DEGREE;
  const dLon = dLat / Math.cos((centre.lat * Math.PI) / 180);
  return { south: centre.lat - dLat, north: centre.lat + dLat, west: centre.lon - dLon, east: centre.lon + dLon };
}

/** Quick test: start -> place -> end plus the visit must fit the budget on its own. */
function detourFits(c: RouteCandidate, req: PlanRequest): boolean {
  const speed = req.preferences.walkingSpeedKmh;
  const there = estimateWalkMinutes(req.start as GeoPoint, c.point, speed);
  const back = estimateWalkMinutes(c.point, req.end as GeoPoint, speed);
  return there + c.dwellMinutes + back <= req.availableMinutes;
}
