import { Injectable } from "@nestjs/common";
import type { LatLng } from "./geo";
import type { Plan, RouteCandidate, TimelineStop } from "./route-candidate";

const MS_PER_MINUTE = 60_000;
const IMPROVEMENT_ROUNDS = 3;
const MIN_ADDED_MINUTES = 1;
const SAME_LENGTH_EPSILON_MINUTES = 0.01;

export type PlannerOptions = {
  start: LatLng;
  end: LatLng;
  startAt: Date;
  budgetMinutes: number;
  maxStops: number;
  walkMinutes: (a: LatLng, b: LatLng) => number;
  isOpen: (candidate: RouteCandidate, at: Date) => boolean;
};

type Insertion = { order: RouteCandidate[]; plan: Plan; ratio: number };

@Injectable()
export class OrienteeringService {
  schedule(order: RouteCandidate[], o: PlannerOptions): Plan | null {
    let minutes = 0;
    let walk = 0;
    let visit = 0;
    let value = 0;
    let prev = o.start;
    const stops: TimelineStop[] = [];
    for (const c of order) {
      const w = o.walkMinutes(prev, c.point);
      minutes += w;
      walk += w;
      const arriveAt = new Date(o.startAt.getTime() + minutes * MS_PER_MINUTE);
      if (!o.isOpen(c, arriveAt)) return null;
      minutes += c.dwellMinutes;
      visit += c.dwellMinutes;
      value += c.value;
      stops.push({
        candidate: c,
        arriveAt,
        departAt: new Date(o.startAt.getTime() + minutes * MS_PER_MINUTE),
        walkMinutes: w,
      });
      prev = c.point;
      if (minutes > o.budgetMinutes) return null;
    }
    const home = o.walkMinutes(prev, o.end);
    minutes += home;
    walk += home;
    if (minutes > o.budgetMinutes) return null;
    return {
      stops,
      endAt: new Date(o.startAt.getTime() + minutes * MS_PER_MINUTE),
      totalMinutes: minutes,
      walkMinutes: walk,
      visitMinutes: visit,
      value,
    };
  }

  plan(candidates: RouteCandidate[], o: PlannerOptions): Plan {
    const cache = new Map<string, number>();
    const memo: PlannerOptions = {
      ...o,
      walkMinutes: (a, b) => {
        const key = `${a.lat},${a.lng}|${b.lat},${b.lng}`;
        let v = cache.get(key);
        if (v === undefined) {
          v = o.walkMinutes(a, b);
          cache.set(key, v);
        }
        return v;
      },
    };
    let order: RouteCandidate[] = [];
    let best = this.schedule(order, memo) ?? this.emptyPlan(o);

    for (let round = 0; round < IMPROVEMENT_ROUNDS; round++) {
      const before = order.length;
      for (;;) {
        if (order.length >= o.maxStops) break;
        const pick = this.bestInsertion(candidates, order, best, memo);
        if (!pick) break;
        order = pick.order;
        best = pick.plan;
      }
      const shortened = this.shorten(order, best, memo);
      order = shortened.order;
      best = shortened.plan;
      if (order.length === before) break;
    }
    return best;
  }

  private bestInsertion(
    candidates: RouteCandidate[],
    order: RouteCandidate[],
    best: Plan,
    o: PlannerOptions,
  ): Insertion | null {
    let pick: Insertion | null = null;
    for (const c of candidates) {
      if (order.includes(c)) continue;
      for (let i = 0; i <= order.length; i++) {
        const next = [...order.slice(0, i), c, ...order.slice(i)];
        const plan = this.schedule(next, o);
        if (!plan) continue;
        const added = Math.max(
          MIN_ADDED_MINUTES,
          plan.totalMinutes - best.totalMinutes,
        );
        const ratio = (plan.value - best.value) / added;
        if (!pick || ratio > pick.ratio) pick = { order: next, plan, ratio };
      }
    }
    return pick;
  }

  private shorten(
    start: RouteCandidate[],
    plan: Plan,
    o: PlannerOptions,
  ): { order: RouteCandidate[]; plan: Plan } {
    let order = start;
    let best = plan;
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < order.length - 1 && !improved; i++) {
        for (let j = i + 1; j < order.length && !improved; j++) {
          const next = [
            ...order.slice(0, i),
            ...order.slice(i, j + 1).reverse(),
            ...order.slice(j + 1),
          ];
          const candidate = this.schedule(next, o);
          if (
            candidate &&
            candidate.totalMinutes <
              best.totalMinutes - SAME_LENGTH_EPSILON_MINUTES
          ) {
            order = next;
            best = candidate;
            improved = true;
          }
        }
      }
    }
    return { order, plan: best };
  }

  private emptyPlan(o: PlannerOptions): Plan {
    const minutes = o.walkMinutes(o.start, o.end);
    return {
      stops: [],
      endAt: new Date(o.startAt.getTime() + minutes * MS_PER_MINUTE),
      totalMinutes: minutes,
      walkMinutes: minutes,
      visitMinutes: 0,
      value: 0,
    };
  }
}
