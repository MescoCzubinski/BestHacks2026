export type SavedRoute = {
  id: string;
  title: string;
  date: string;
  tags: string[];
  placeIds: string[];
  durationMin: number;
};

export const SAVED_ROUTES: SavedRoute[] = [
  {
    id: "r1",
    title: "Wrocław w stylu Art Deco",
    date: "2026-09-27",
    tags: ["Art Deco"],
    placeIds: ["rynek", "panorama", "hala"],
    durationMin: 180,
  },
  {
    id: "r2",
    title: "Nad Odrą",
    date: "2026-09-14",
    tags: ["Parki", "Zabytki"],
    placeIds: ["tumski", "slodowa"],
    durationMin: 90,
  },
  {
    id: "r3",
    title: "Stare Miasto po południu",
    date: "2026-08-30",
    tags: ["Historia"],
    placeIds: ["rynek", "tumski", "panorama", "slodowa"],
    durationMin: 150,
  },
];
