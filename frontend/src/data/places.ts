export type Category = "sights" | "parks";

export type Place = {
  id: string;
  name: string;
  short: string;
  tag: string;
  category: Category;
  blurb: string;
  lat: number;
  lng: number;
};

export const PLACES: Place[] = [
  {
    id: "rynek",
    name: "Rynek",
    short: "Rynek",
    tag: "Stare Miasto",
    category: "sights",
    blurb:
      "Jeden z największych średniowiecznych rynków w Europie, otoczony kolorowymi kamienicami i gotyckim ratuszem.",
    lat: 51.11,
    lng: 17.0326,
  },
  {
    id: "hala",
    name: "Hala Stulecia",
    short: "Hala",
    tag: "Wpis UNESCO",
    category: "sights",
    blurb:
      "Żelbetowy symbol z 1913 roku z ogromną kopułą, tuż obok Ogrodu Japońskiego i Fontanny Multimedialnej.",
    lat: 51.1068,
    lng: 17.0766,
  },
  {
    id: "tumski",
    name: "Ostrów Tumski",
    short: "Tumski",
    tag: "Wyspa Katedralna",
    category: "sights",
    blurb:
      "Najstarsza część miasta. Gazowe latarnie, dwuwieżowa katedra i ciche uliczki nad rzeką.",
    lat: 51.1148,
    lng: 17.046,
  },
  {
    id: "panorama",
    name: "Panorama Racławicka",
    short: "Panorama",
    tag: "Muzeum",
    category: "sights",
    blurb:
      "Monumentalny, XIX-wieczny obraz w rotundzie przedstawiający bitwę pod Racławicami z 1794 roku.",
    lat: 51.1097,
    lng: 17.0447,
  },
  {
    id: "slodowa",
    name: "Wyspa Słodowa",
    short: "Słodowa",
    tag: "Park na wyspie",
    category: "parks",
    blurb:
      "Zielona wyspa na Odrze. Ulubione miejsce wrocławian na letnie wieczory nad wodą.",
    lat: 51.113,
    lng: 17.0405,
  },
];
