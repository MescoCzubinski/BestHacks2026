import { useState } from "react";
import { listSavedRoutes, type SavedRoute } from "../api/savedRoutes";

export function useSavedRoutes(): { routes: SavedRoute[] } {
  const [routes] = useState(listSavedRoutes);
  return { routes };
}
