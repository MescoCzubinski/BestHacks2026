import { useEffect, useState } from "react";
import { searchLocations, type Location } from "../api/searchLocations";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export type SuggestionState = "idle" | "loading" | "ready" | "error";

type Result = { query: string; locations: Location[]; failed: boolean };

export function useLocationSuggestions(query: string, enabled: boolean) {
  const [result, setResult] = useState<Result | null>(null);
  const q = query.trim();
  const active = enabled && q.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchLocations(q, controller.signal)
        .then((locations) => setResult({ query: q, locations, failed: false }))
        .catch(() => {
          if (!controller.signal.aborted)
            setResult({ query: q, locations: [], failed: true });
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, active]);

  const none: Location[] = [];
  if (!active) return { locations: none, state: "idle" as const };
  if (!result || result.query !== q)
    return { locations: none, state: "loading" as const };
  return {
    locations: result.locations,
    state: result.failed ? ("error" as const) : ("ready" as const),
  };
}
