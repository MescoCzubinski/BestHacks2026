import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventBus } from "../../common/bus/event-bus";
import type { Plan, RouteCandidate } from "./route-candidate";
import { NoMatchingPlacesException } from "../exceptions/no-matching-places.exception";
import { TimeBudgetTooSmallException } from "../exceptions/time-budget-too-small.exception";
import { CandidateSelectionService } from "./candidate-selection.service";
import { OpeningHoursService } from "./opening-hours.service";
import {
  OrienteeringService,
  type PlannerOptions,
} from "./orienteering.service";
import {
  RoutePlanner,
  type PlannedRoute,
  type PlannedStop,
  type RouteQuery,
} from "./route-planner";
import { WalkingEstimateService } from "./walking-estimate.service";

const DEFAULT_TIME_ZONE = "Europe/Warsaw";
const MAX_STOPS = 60; // a safety bound; the time budget decides how many stops fit
const MAX_EXTRAS = 10;
const MAX_REFINEMENTS = 3;
const SECONDS_PER_MINUTE = 60;

@Injectable()
export class OrienteeringRoutePlanner extends RoutePlanner {
  private readonly log = new Logger(OrienteeringRoutePlanner.name);
  private readonly timeZone: string;

  constructor(
    private readonly selection: CandidateSelectionService,
    private readonly bus: EventBus,
    private readonly orienteering: OrienteeringService,
    private readonly openingHours: OpeningHoursService,
    private readonly walking: WalkingEstimateService,
    config: ConfigService,
  ) {
    super();
    this.timeZone = config.get<string>("REGION_TIMEZONE") ?? DEFAULT_TIME_ZONE;
  }

  async plan(query: RouteQuery): Promise<PlannedRoute> {
    const direct = this.walking.minutes(query.start, query.end);
    if (direct > query.durationMinutes)
      throw new TimeBudgetTooSmallException(direct);

    const candidates = await this.selection.select(query);
    if (candidates.length === 0) throw new NoMatchingPlacesException();

    const options: PlannerOptions = {
      start: query.start,
      end: query.end,
      startAt: query.startTime ?? new Date(),
      budgetMinutes: query.durationMinutes,
      maxStops: MAX_STOPS,
      walkMinutes: (a, b) => this.walking.minutes(a, b),
      isOpen: (c, at) =>
        this.openingHours.isOpenAt(c.openingHours, at, this.timeZone),
    };
    let plan = this.orienteering.plan(candidates, options);
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
      plan = this.orienteering.plan(
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
