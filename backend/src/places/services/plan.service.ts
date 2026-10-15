import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { RoutedPath } from "../../common/bus/contracts";
import { EventBus } from "../../common/bus/event-bus";
import { NoMatchingPlacesException } from "../exceptions/no-matching-places.exception";
import { TimeBudgetTooSmallException } from "../exceptions/time-budget-too-small.exception";
import type { LatLng } from "./geo";
import { isOpenAt } from "./opening-hours";
import { planOrienteering, type PlannerOptions } from "./orienteering";
import { PlaceService } from "./place.service";
import type {
  Plan,
  PlaceCandidate,
  PlannedRoute,
  PlannedStop,
  RouteCandidate,
  RouteQuery,
} from "./types";

export type BuiltRoute = PlannedRoute & { path: RoutedPath };

const DEFAULT_TIME_ZONE = "Europe/Warsaw";
const MAX_STOPS = 60; // a safety bound; the time budget decides how many stops fit
const MAX_EXTRAS = 10;
const MAX_REFINEMENTS = 3;
const SECONDS_PER_MINUTE = 60;

const MIN_TAG_PERCENT = 50;
const MAX_CANDIDATES = 120;
const QUERY_LIMIT = 600;
const KM_PER_DEGREE = 111.2;
const BASE_SIGNIFICANCE = 0.5;

const EARTH_RADIUS_M = 6_371_000;
export const DETOUR_FACTOR = 1.3;
export const DEFAULT_WALKING_SPEED_KMH = 4.5;

export function walkMinutes(
  a: LatLng,
  b: LatLng,
  speedKmh = DEFAULT_WALKING_SPEED_KMH,
): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  const meters = 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
  return ((meters * DETOUR_FACTOR) / 1000 / speedKmh) * 60;
}

@Injectable()
export class PlanService {
  private readonly log = new Logger(PlanService.name);
  private readonly timeZone: string;

  constructor(
    private readonly bus: EventBus,
    private readonly places: PlaceService,
    config: ConfigService,
  ) {
    this.timeZone = config.get<string>("REGION_TIMEZONE") ?? DEFAULT_TIME_ZONE;
  }

  async build(query: RouteQuery): Promise<BuiltRoute> {
    await this.bus.request("location.ensure-inside", {
      points: [query.start, query.end],
    });
    const { stops, extras } = await this.plan(query);
    const path = await this.bus.request("directions.route", {
      points: [
        query.start,
        ...stops.map(({ lat, lng }) => ({ lat, lng })),
        query.end,
      ],
    });
    return { stops, extras, path };
  }

  async plan(query: RouteQuery): Promise<PlannedRoute> {
    const direct = walkMinutes(query.start, query.end);
    if (direct > query.durationMinutes)
      throw new TimeBudgetTooSmallException(direct);

    const candidates = await this.selectCandidates(query);
    if (candidates.length === 0) throw new NoMatchingPlacesException();

    const options: PlannerOptions = {
      start: query.start,
      end: query.end,
      startAt: query.startTime ?? new Date(),
      budgetMinutes: query.durationMinutes,
      maxStops: MAX_STOPS,
      walkMinutes: (a, b) => walkMinutes(a, b),
      isOpen: (c, at) => isOpenAt(c.openingHours, at, this.timeZone),
    };
    let plan = planOrienteering(candidates, options);
    if (plan.stops.length === 0) throw new NoMatchingPlacesException();

    for (let attempt = 0; attempt < MAX_REFINEMENTS; attempt++) {
      const order = plan.stops.map((s) => s.candidate);
      const path = await this.bus.request("directions.route", {
        points: [query.start, ...order.map((c) => c.point), query.end],
      });
      const walk = path.durationSeconds / SECONDS_PER_MINUTE;
      const visit = order.reduce((sum, c) => sum + c.dwellMinutes, 0);
      if (walk + visit <= query.durationMinutes || order.length <= 1) break;
      this.log.debug(
        `real walk ${Math.round(walk)} min overshoots, dropping a stop`,
      );
      const drop = this.weakest(plan);
      plan = planOrienteering(
        candidates.filter((c) => c !== drop),
        { ...options, maxStops: order.length - 1 },
      );
      if (plan.stops.length === 0) break;
    }
    const chosen = new Set(plan.stops.map((s) => s.candidate));
    return {
      stops: plan.stops.map((s) => this.toPlannedStop(s.candidate, s.arriveAt)),
      extras: candidates
        .filter((c) => !chosen.has(c))
        .slice(0, MAX_EXTRAS)
        .map((c) => this.toPlannedStop(c)),
    };
  }

  async selectCandidates(query: RouteQuery): Promise<RouteCandidate[]> {
    if (query.tags.length === 0) return [];
    const box = this.reachableBox(query);
    const found = await this.places.findCandidates({
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


    const notable = BASE_SIGNIFICANCE + p.significance / 200;
    return {
      place: p,
      point: { lat: p.latitude, lng: p.longitude },
      value: relevance * notable,
      dwellMinutes: p.visitMinutes,
      openingHours: p.openingHours,
    };
  }

  private detourFits(c: RouteCandidate, query: RouteQuery): boolean {
    const there = walkMinutes(query.start, c.point);
    const back = walkMinutes(c.point, query.end);
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

  private toPlannedStop(c: RouteCandidate, arriveAt?: Date): PlannedStop {
    const p = c.place;
    return {
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      lat: p.latitude,
      lng: p.longitude,
      visitMinutes: c.dwellMinutes,
      enterable: p.enterable,
      arriveAt: arriveAt?.toISOString(),
      imageUrl: p.mainImageUrl,
    };
  }

  private weakest(plan: Plan): RouteCandidate {
    return plan.stops.reduce((worst, s) => {
      const cost = s.walkMinutes + s.candidate.dwellMinutes;
      const worstCost = worst.walkMinutes + worst.candidate.dwellMinutes;
      return s.candidate.value / cost < worst.candidate.value / worstCost
        ? s
        : worst;
    }).candidate;
  }
}
