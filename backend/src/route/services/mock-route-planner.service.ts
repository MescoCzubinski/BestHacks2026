import { Injectable } from "@nestjs/common";
import {
  RoutePlanner,
  type PlannedRoute,
  type PlannedStop,
  type RouteQuery,
} from "./route-planner";

const WALKING_MINUTES_PER_LEG = 15; // rough estimate; the real time comes from the path finder

const MOCK_STOPS: PlannedStop[] = [
  {
    id: "rynek",
    name: "Rynek",
    description:
      "Jeden z największych średniowiecznych rynków w Europie, z gotyckim ratuszem.",
    lat: 51.11,
    lng: 17.0326,
    visitMinutes: 15,
    enterable: false,
  },
  {
    id: "panorama",
    name: "Panorama Racławicka",
    description:
      "Monumentalny obraz z XIX wieku przedstawiający bitwę pod Racławicami.",
    lat: 51.1097,
    lng: 17.0447,
    visitMinutes: 40,
    enterable: true,
  },
  {
    id: "tumski",
    name: "Ostrów Tumski",
    description: "Najstarsza część miasta z gazowymi latarniami i katedrą.",
    lat: 51.1148,
    lng: 17.046,
    visitMinutes: 10,
    enterable: false,
  },
  {
    id: "slodowa",
    name: "Wyspa Słodowa",
    description: "Zielona wyspa na Odrze, ulubione miejsce wrocławian.",
    lat: 51.113,
    lng: 17.0405,
    visitMinutes: 5,
    enterable: false,
  },
  {
    id: "hala",
    name: "Hala Stulecia",
    description:
      "Żelbetowy symbol z 1913 roku wpisany na listę UNESCO, obok Ogrodu Japońskiego.",
    lat: 51.1068,
    lng: 17.0766,
    visitMinutes: 45,
    enterable: true,
  },
];

/** Placeholder until the real planner exists: fixed Wrocław stops, as many as fit the time budget. */
@Injectable()
export class MockRoutePlanner extends RoutePlanner {
  async plan(query: RouteQuery): Promise<PlannedRoute> {
    const chosen: PlannedStop[] = [];
    let used = 0;
    for (const stop of MOCK_STOPS) {
      used += stop.visitMinutes + WALKING_MINUTES_PER_LEG;
      if (chosen.length > 0 && used > query.durationMinutes) break;
      chosen.push(stop);
    }
    return {
      stops: chosen,
      extras: MOCK_STOPS.filter((s) => !chosen.includes(s)),
    };
  }
}
