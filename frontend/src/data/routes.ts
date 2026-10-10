export type SavedRoute = {
  id: string;
  title: string;
  city: string;
  date: string;
  tags: string[];
  placeIds: string[];
  durationMin: number;
};

export const SAVED_ROUTES: SavedRoute[] = [
  {
    id: "r1",
    title: "Wrocław w stylu Art Deco",
    city: "Wrocław",
    date: "2026-09-27",
    tags: ["art_deco"],
    placeIds: ["rynek", "panorama", "hala"],
    durationMin: 180,
  },
  {
    id: "r2",
    title: "Nad Odrą",
    city: "Wrocław",
    date: "2026-09-14",
    tags: ["park", "monument"],
    placeIds: ["tumski", "slodowa"],
    durationMin: 90,
  },
  {
    id: "r3",
    title: "Stare Miasto po południu",
    city: "Wrocław",
    date: "2026-08-30",
    tags: ["polish_heritage"],
    placeIds: ["rynek", "tumski", "panorama", "slodowa"],
    durationMin: 150,
  },
];
