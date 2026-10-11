import type { RouteRequest } from "@/features/build-route";
import type { Point } from "@/features/pick-location";

export type PlanFormState = {
  start: Point;
  sameEnd: boolean;
  end: Point;
  hours: string;
  wheelchair: boolean;
  tags: string[];
};

export const MIN_HOURS = 0.25;
export const MAX_HOURS = 12;
const MINUTES_PER_HOUR = 60;

/** "2", "1,5", "1.5" and "1:30" all mean a number of hours; anything else is not a time. */
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

export function toRouteRequest(form: PlanFormState): RouteRequest | null {
  if (formProblem(form) || !hasCoordinates(form.start)) return null;
  return {
    start: { lat: form.start.lat, lng: form.start.lng },
    end:
      !form.sameEnd && hasCoordinates(form.end)
        ? { lat: form.end.lat, lng: form.end.lng }
        : undefined,
    durationMinutes: hoursToMinutes(form.hours),
    wheelchair: form.wheelchair,
    tags: form.tags,
  };
}
