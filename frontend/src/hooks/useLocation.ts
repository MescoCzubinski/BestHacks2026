import { useSyncExternalStore } from "react";
import { currentLocation, subscribeToLocation } from "@/lib/navigation";

export function useLocation(): { pathname: string; search: string } {
  const href = useSyncExternalStore(subscribeToLocation, currentLocation);
  const url = new URL(href, "http://local");
  return { pathname: url.pathname, search: url.search };
}
