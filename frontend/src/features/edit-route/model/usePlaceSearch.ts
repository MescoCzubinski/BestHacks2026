import { useEffect, useState } from "react";
import type { RouteStop } from "@/entities/route";
import { searchPlaces } from "../api/searchPlaces";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export type PlaceSearchState = "idle" | "loading" | "ready" | "error";

type Result = { query: string; places: RouteStop[]; failed: boolean };

export function usePlaceSearch(query: string) {
  const [result, setResult] = useState<Result | null>(null);
  const q = query.trim();
  const active = q.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchPlaces(q, controller.signal)
        .then((places) => setResult({ query: q, places, failed: false }))
        .catch(() => {
          if (!controller.signal.aborted)
            setResult({ query: q, places: [], failed: true });
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, active]);

  const none: RouteStop[] = [];
  if (!active) return { places: none, state: "idle" as PlaceSearchState };
  if (!result || result.query !== q)
    return { places: none, state: "loading" as PlaceSearchState };
  return {
    places: result.places,
    state: (result.failed ? "error" : "ready") as PlaceSearchState,
  };
}
