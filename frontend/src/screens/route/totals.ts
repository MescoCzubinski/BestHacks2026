import type { RouteStop, WalkingPath } from "@/api/types";

export function routeTotals(path: WalkingPath, stops: RouteStop[]) {
  const walkingMinutes = Math.round(path.durationSeconds / 60);
  const visitMinutes = stops.reduce((sum, stop) => sum + stop.visitMinutes, 0);
  return {
    walkingMinutes,
    visitMinutes,
    totalMinutes: walkingMinutes + visitMinutes,
  };
}
