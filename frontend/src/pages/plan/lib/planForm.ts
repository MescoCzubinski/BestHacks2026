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

const hasCoordinates = (p: Point): p is Required<Point> =>
  p.lat !== undefined && p.lng !== undefined;

export function formProblem(form: PlanFormState): string | null {
  if (!hasCoordinates(form.start))
    return "Wybierz punkt startu z listy podpowiedzi.";
  if (!form.sameEnd && !hasCoordinates(form.end))
    return "Wybierz punkt końcowy z listy podpowiedzi.";
  const hours = Number(form.hours);
  if (!Number.isFinite(hours) || hours < MIN_HOURS || hours > MAX_HOURS)
    return "Podaj czas od 15 minut do 12 godzin.";
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
    durationMinutes: Math.round(Number(form.hours) * 60),
    wheelchair: form.wheelchair,
    tags: form.tags,
  };
}
