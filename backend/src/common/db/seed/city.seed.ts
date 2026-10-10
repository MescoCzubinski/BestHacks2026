import type { Bbox } from "../../../city/bbox";

type SeedCity = {
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  bbox: Bbox;
};

/** Cities with heritage data. Adding one here (and its places) makes it selectable. */
export const CITY_SEEDS: SeedCity[] = [
  {
    name: "Wrocław",
    region: "dolnośląskie",
    latitude: 51.1079,
    longitude: 17.0385,
    bbox: [16.8, 51.04, 17.18, 51.21],
  },
];
