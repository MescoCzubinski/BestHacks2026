import { useEffect, useState } from "react";
import { listSavedRoutes, type SavedRoute } from "../api/savedRoutes";

type State = { routes: SavedRoute[]; status: "loading" | "ready" | "error" };

export function useSavedRoutes(): State {
  const [state, setState] = useState<State>({ routes: [], status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    listSavedRoutes(controller.signal)
      .then((routes) => setState({ routes, status: "ready" }))
      .catch(() => {
        if (!controller.signal.aborted)
          setState({ routes: [], status: "error" });
      });
    return () => controller.abort();
  }, []);

  return state;
}
