import type { RoutePlan } from "@/lib/routePlan";
import type { Point } from "./LocationField";

export type PlanFormState = {
  start: Point;
  sameEnd: boolean;
  end: Point;
  hours: string;
  tags: string[];
};

export const MIN_HOURS = 0.25;
export const MAX_HOURS = 12;
const MINUTES_PER_HOUR = 60;

export function parseHours(text: string): number | null {
  const t = text.trim().replace(",", ".");
  const clock = /^(\d{1,2}):([0-5]\d)$/.exec(t);
  if (clock) return Number(clock[1]) + Number(clock[2]) / MINUTES_PER_HOUR;
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null;
}

export function hoursToMinutes(text: string): number {
  return Math.round((parseHours(text) ?? 0) * MINUTES_PER_HOUR);
}

export function formatHours(minutes: number): string {
  const hours = Math.round((minutes / MINUTES_PER_HOUR) * 100) / 100;
  return String(hours).replace(".", ",");
}

const hasCoordinates = (p: Point): p is Required<Point> =>
  p.lat !== undefined && p.lng !== undefined;

export function formProblem(form: PlanFormState): string | null {
  if (!hasCoordinates(form.start))
    return "Wybierz punkt startu z listy podpowiedzi.";
  if (!form.sameEnd && !hasCoordinates(form.end))
    return "Wybierz punkt końcowy z listy podpowiedzi.";
  const hours = parseHours(form.hours);
  if (hours === null || hours < MIN_HOURS || hours > MAX_HOURS)
    return "Podaj czas od 15 minut do 12 godzin, np. 1,5 lub 1:30.";
  if (form.tags.length === 0) return "Dodaj przynajmniej jeden motyw.";
  return null;
}

export function toRoutePlan(form: PlanFormState): RoutePlan | null {
  if (formProblem(form) || !hasCoordinates(form.start)) return null;
  return {
    tags: form.tags,
    start: form.start,
    end: !form.sameEnd && hasCoordinates(form.end) ? form.end : undefined,
    durationMinutes: hoursToMinutes(form.hours),
  };
}

export function formFromPlan(plan: RoutePlan): PlanFormState {
  return {
    start: plan.start,
    sameEnd: !plan.end,
    end: plan.end ?? { label: "" },
    hours: formatHours(plan.durationMinutes),
    tags: plan.tags,
  };
}
