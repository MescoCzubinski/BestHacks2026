import type { LatLng } from "../../city/bbox";
import type { Plan, RouteCandidate, TimelineStop } from "./candidate";

const MS_PER_MINUTE = 60_000;
const IMPROVEMENT_ROUNDS = 3;
const MIN_ADDED_MINUTES = 1;

export type PlannerOptions = {
  start: LatLng;
  end: LatLng;
  startAt: Date;
  budgetMinutes: number;
  maxStops: number;
  walkMinutes: (a: LatLng, b: LatLng) => number;
  isOpen: (candidate: RouteCandidate, at: Date) => boolean;
};

export function schedule(
  order: RouteCandidate[],
  o: PlannerOptions,
): Plan | null {
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

export function planRoute(
  candidates: RouteCandidate[],
  o: PlannerOptions,
): Plan {
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
  let best = schedule(order, memo) ?? emptyPlan(o);

  for (let round = 0; round < IMPROVEMENT_ROUNDS; round++) {
    const before = order.length;
    for (;;) {
      if (order.length >= o.maxStops) break;
      let pick: { order: RouteCandidate[]; plan: Plan; ratio: number } | null =
        null;
      for (const c of candidates) {
        if (order.includes(c)) continue;
        for (let i = 0; i <= order.length; i++) {
          const next = [...order.slice(0, i), c, ...order.slice(i)];
          const plan = schedule(next, memo);
          if (!plan) continue;
          const added = Math.max(
            MIN_ADDED_MINUTES,
            plan.totalMinutes - best.totalMinutes,
          );
          const ratio = (plan.value - best.value) / added;
          if (!pick || ratio > pick.ratio) pick = { order: next, plan, ratio };
        }
      }
      if (!pick) break;
      order = pick.order;
      best = pick.plan;
    }
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
          const plan = schedule(next, memo);
          if (plan && plan.totalMinutes < best.totalMinutes - 0.01) {
            order = next;
            best = plan;
            improved = true;
          }
        }
      }
    }
    if (order.length === before) break;
  }
  return best;
}

function emptyPlan(o: PlannerOptions): Plan {
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

export function timeline(
  order: RouteCandidate[],
  legMinutes: number[],
  o: Pick<PlannerOptions, "startAt" | "budgetMinutes">,
): Plan {
  let minutes = 0;
  let walk = 0;
  let visit = 0;
  let value = 0;
  const stops: TimelineStop[] = order.map((c, i) => {
    minutes += legMinutes[i];
    walk += legMinutes[i];
    const arriveAt = new Date(o.startAt.getTime() + minutes * MS_PER_MINUTE);
    minutes += c.dwellMinutes;
    visit += c.dwellMinutes;
    value += c.value;
    return {
      candidate: c,
      arriveAt,
      departAt: new Date(o.startAt.getTime() + minutes * MS_PER_MINUTE),
      walkMinutes: legMinutes[i],
    };
  });
  const last = legMinutes[order.length] ?? 0;
  minutes += last;
  walk += last;
  return {
    stops,
    endAt: new Date(o.startAt.getTime() + minutes * MS_PER_MINUTE),
    totalMinutes: minutes,
    walkMinutes: walk,
    visitMinutes: visit,
    value,
  };
}
