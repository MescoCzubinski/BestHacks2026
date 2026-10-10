import { useCallback, useEffect, useRef, useState } from "react";
import {
  findPath,
  type RoutePoint,
  type RouteStop,
  type WalkingPath,
} from "@/entities/route";
import { moveItem } from "../lib/moveItem";

const RECALCULATE_DELAY_MS = 400;

export type EditableRoute = {
  start: RoutePoint;
  end: RoutePoint;
  stops: RouteStop[];
  path: WalkingPath;
};

const orderKey = (stops: RouteStop[]) => stops.map((s) => s.id).join("|");
const samePoint = (a: RoutePoint, b: RoutePoint) =>
  a.lat === b.lat && a.lng === b.lng;
const EMPTY_PATH: WalkingPath = {
  distanceMeters: 0,
  durationSeconds: 0,
  coordinates: [],
};

export function useEditableRoute() {
  const [route, setRoute] = useState<EditableRoute | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState("");
  const pathFor = useRef("");

  const load = useCallback((source: EditableRoute) => {
    pathFor.current = orderKey(source.stops);
    setError("");
    setRoute(source);
  }, []);

  const reset = useCallback(() => {
    setError("");
    setRoute(null);
  }, []);

  const move = useCallback((from: number, to: number) => {
    setRoute((r) => r && { ...r, stops: moveItem(r.stops, from, to) });
  }, []);

  const remove = useCallback((id: string) => {
    setRoute((r) => r && { ...r, stops: r.stops.filter((s) => s.id !== id) });
  }, []);

  const add = useCallback((stop: RouteStop) => {
    setRoute((r) =>
      r && !r.stops.some((s) => s.id === stop.id)
        ? { ...r, stops: [...r.stops, stop] }
        : r,
    );
  }, []);

  const stops = route?.stops;
  useEffect(() => {
    if (!route || !stops) return;
    const key = orderKey(stops);
    if (key === pathFor.current) return;

    const apply = (path: WalkingPath) => {
      pathFor.current = key;
      setRoute((r) => (r && orderKey(r.stops) === key ? { ...r, path } : r));
    };

    if (stops.length === 0 && samePoint(route.start, route.end)) {
      apply(EMPTY_PATH);
      return;
    }

    const controller = new AbortController();
    setRecalculating(true);
    setError("");
    const timer = setTimeout(() => {
      findPath([route.start, ...stops, route.end], controller.signal)
        .then(apply)
        .catch((e: unknown) => {
          if (controller.signal.aborted) return;
          setError(
            e instanceof Error ? e.message : "Nie udało się przeliczyć trasy.",
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setRecalculating(false);
        });
    }, RECALCULATE_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
      setRecalculating(false);
    };
  }, [stops]);

  return { route, recalculating, error, load, reset, move, remove, add };
}
