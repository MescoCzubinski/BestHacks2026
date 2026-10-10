import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PathLeg } from "../../path/path-types";
import { PathService } from "../../path/services/path.service";
import { estimateWalkMinutes } from "../../path/services/straight-line";
import { NoMatchingPlacesException } from "../exceptions/no-matching-places.exception";
import { TimeBudgetTooSmallException } from "../exceptions/time-budget-too-small.exception";
import type { PlanRequest, Plan, RouteCandidate } from "../route-types";
import { CandidateSelectionService } from "./candidate-selection.service";
import { isOpenAt } from "./opening-hours";
import { planRoute, timeline, type PlannerOptions } from "./route-planner";

const MAX_REFINEMENTS = 4; // re-checks against real walking times before giving up on trimming stops
const DEFAULT_TIME_ZONE = "Europe/Warsaw";
const TOP_TAGS_PER_STOP = 4;

export type RoutePlanResponse = {
  startAt: string;
  endAt: string;
  routing: "graphhopper" | "estimate" | "mixed";
  totals: {
    budgetMinutes: number;
    totalMinutes: number;
    walkingMinutes: number;
    visitMinutes: number;
    distanceM: number;
    stops: number;
  };
  stops: {
    order: number;
    place: {
      id: string;
      name: string;
      lat: number;
      lon: number;
      description: string | null;
      mainImageUrl: string | null;
      year: number | null;
      significance: number;
      tags: { tag: string; percent: number }[];
    };
    arriveAt: string;
    departAt: string;
    visitMinutes: number;
    openingHours: string | null;
    /** "open" when opening hours are known and we arrive inside them; "unknown" when there is no data (assumed open). */
    openStatus: "open" | "unknown";
    accessibility: "yes" | "limited" | "unknown";
  }[];
  legs: {
    fromIndex: number;
    toIndex: number;
    distanceM: number;
    durationMinutes: number;
    geometry: [number, number][];
    source: PathLeg["source"];
  }[];
};

/** Orchestrates the plan: pick candidates, order them on estimates, then confirm with real walking paths. */
@Injectable()
export class RoutePlanService {
  private readonly log = new Logger(RoutePlanService.name);
  private readonly timeZone: string;

  constructor(
    private readonly selection: CandidateSelectionService,
    private readonly paths: PathService,
    config: ConfigService,
  ) {
    this.timeZone = config.get<string>("REGION_TIMEZONE") ?? DEFAULT_TIME_ZONE;
  }

  async plan(req: PlanRequest): Promise<RoutePlanResponse> {
    const speed = req.preferences.walkingSpeedKmh;
    const direct = estimateWalkMinutes(req.start, req.end, speed);
    if (direct > req.availableMinutes) throw new TimeBudgetTooSmallException(direct);

    const candidates = await this.selection.select(req);
    if (candidates.length === 0) throw new NoMatchingPlacesException();

    const options: PlannerOptions = {
      start: req.start,
      end: req.end,
      startAt: req.startAt,
      budgetMinutes: req.availableMinutes,
      maxStops: req.preferences.maxStops,
      walkMinutes: (a, b) => estimateWalkMinutes(a, b, speed),
      isOpen: (c, at) => isOpenAt(c.openingHours, at, this.timeZone),
    };
    const planned = planRoute(candidates, options);
    if (planned.stops.length === 0) throw new NoMatchingPlacesException();

    return this.confirmWithRealPaths(req, options, planned.stops.map((s) => s.candidate));
  }

  /** Walk the chosen order with GraphHopper; if real times break the budget or a closing time, drop the weakest stop. */
  private async confirmWithRealPaths(req: PlanRequest, options: PlannerOptions, initial: RouteCandidate[]): Promise<RoutePlanResponse> {
    let order = initial;
    for (let attempt = 0; ; attempt++) {
      const points = [req.start, ...order.map((c) => c.point), req.end];
      const path = await this.paths.compute(points, { walkingSpeedKmh: req.preferences.walkingSpeedKmh });
      const legMinutes = path.legs.map((l) => l.durationS / 60);
      const plan = timeline(order, legMinutes, options);
      const closed = plan.stops.find((s) => !options.isOpen(s.candidate, s.arriveAt));
      const fits = plan.totalMinutes <= req.availableMinutes && !closed;
      if (fits || order.length === 0 || attempt >= MAX_REFINEMENTS) {
        if (!fits) this.log.warn(`returning a route that still overshoots by ${Math.round(plan.totalMinutes - req.availableMinutes)} min`);
        return this.respond(req, plan, path.legs, path.distanceM);
      }
      const drop = closed?.candidate ?? weakest(plan);
      order = order.filter((c) => c !== drop);
    }
  }

  private respond(req: PlanRequest, plan: Plan, legs: PathLeg[], distanceM: number): RoutePlanResponse {
    const sources = new Set(legs.map((l) => l.source));
    return {
      startAt: req.startAt.toISOString(),
      endAt: plan.endAt.toISOString(),
      routing: sources.size > 1 ? "mixed" : sources.has("graphhopper") ? "graphhopper" : "estimate",
      totals: {
        budgetMinutes: req.availableMinutes,
        totalMinutes: Math.round(plan.totalMinutes),
        walkingMinutes: Math.round(plan.walkMinutes),
        visitMinutes: Math.round(plan.visitMinutes),
        distanceM: Math.round(distanceM),
        stops: plan.stops.length,
      },
      stops: plan.stops.map((s, i) => {
        const p = s.candidate.place;
        return {
          order: i + 1,
          place: {
            id: p.id,
            name: p.name,
            lat: p.latitude,
            lon: p.longitude,
            description: p.description,
            mainImageUrl: p.mainImageUrl,
            year: p.year,
            significance: p.significance,
            tags: Object.entries(p.tags)
              .map(([tag, percent]) => ({ tag, percent: percent as number }))
              .sort((a, b) => b.percent - a.percent)
              .slice(0, TOP_TAGS_PER_STOP),
          },
          arriveAt: s.arriveAt.toISOString(),
          departAt: s.departAt.toISOString(),
          visitMinutes: s.candidate.dwellMinutes,
          openingHours: s.candidate.openingHours,
          openStatus: s.candidate.openingHours ? "open" : "unknown",
          accessibility: s.candidate.accessibility,
        };
      }),
      legs: legs.map((l, i) => ({
        fromIndex: i,
        toIndex: i + 1,
        distanceM: Math.round(l.distanceM),
        durationMinutes: Math.round(l.durationS / 60),
        geometry: l.geometry,
        source: l.source,
      })),
    };
  }
}

/** The stop that gives the least value per minute it takes (walking to it plus the visit). */
function weakest(plan: Plan): RouteCandidate {
  return plan.stops.reduce((worst, s) => {
    const cost = s.walkMinutes + s.candidate.dwellMinutes;
    const worstCost = worst.walkMinutes + worst.candidate.dwellMinutes;
    return s.candidate.value / cost < worst.candidate.value / worstCost ? s : worst;
  }).candidate;
}
