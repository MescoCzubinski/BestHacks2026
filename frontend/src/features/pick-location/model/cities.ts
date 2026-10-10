export type City = {
  name: string;
  region: string;
  lat: number;
  lng: number;
};

/** Larger Polish cities and popular tourist towns, roughly by population. */
export const CITIES: City[] = [
  { name: "Warszawa", region: "mazowieckie", lat: 52.2297, lng: 21.0122 },
  { name: "Kraków", region: "małopolskie", lat: 50.0647, lng: 19.945 },
  { name: "Łódź", region: "łódzkie", lat: 51.7592, lng: 19.456 },
  { name: "Wrocław", region: "dolnośląskie", lat: 51.1079, lng: 17.0385 },
  { name: "Poznań", region: "wielkopolskie", lat: 52.4064, lng: 16.9252 },
  { name: "Gdańsk", region: "pomorskie", lat: 54.352, lng: 18.6466 },
  {
    name: "Szczecin",
    region: "zachodniopomorskie",
    lat: 53.4285,
    lng: 14.5528,
  },
  {
    name: "Bydgoszcz",
    region: "kujawsko-pomorskie",
    lat: 53.1235,
    lng: 18.0084,
  },
  { name: "Lublin", region: "lubelskie", lat: 51.2465, lng: 22.5684 },
  { name: "Białystok", region: "podlaskie", lat: 53.1325, lng: 23.1688 },
  { name: "Katowice", region: "śląskie", lat: 50.2649, lng: 19.0238 },
  { name: "Gdynia", region: "pomorskie", lat: 54.5189, lng: 18.5305 },
  { name: "Częstochowa", region: "śląskie", lat: 50.7964, lng: 19.12 },
  { name: "Radom", region: "mazowieckie", lat: 51.4027, lng: 21.1471 },
  { name: "Rzeszów", region: "podkarpackie", lat: 50.0412, lng: 21.9991 },
  { name: "Toruń", region: "kujawsko-pomorskie", lat: 53.0138, lng: 18.5984 },
  { name: "Kielce", region: "świętokrzyskie", lat: 50.8661, lng: 20.6286 },
  { name: "Gliwice", region: "śląskie", lat: 50.2945, lng: 18.6714 },
  {
    name: "Olsztyn",
    region: "warmińsko-mazurskie",
    lat: 53.7784,
    lng: 20.4801,
  },
  { name: "Bielsko-Biała", region: "śląskie", lat: 49.8224, lng: 19.0584 },
  { name: "Zielona Góra", region: "lubuskie", lat: 51.9356, lng: 15.5062 },
  { name: "Opole", region: "opolskie", lat: 50.6751, lng: 17.9213 },
  {
    name: "Gorzów Wielkopolski",
    region: "lubuskie",
    lat: 52.7368,
    lng: 15.2288,
  },
  { name: "Elbląg", region: "warmińsko-mazurskie", lat: 54.1522, lng: 19.4088 },
  { name: "Płock", region: "mazowieckie", lat: 52.5463, lng: 19.7065 },
  { name: "Wałbrzych", region: "dolnośląskie", lat: 50.7714, lng: 16.2843 },
  { name: "Tarnów", region: "małopolskie", lat: 50.0121, lng: 20.9858 },
  { name: "Kalisz", region: "wielkopolskie", lat: 51.7611, lng: 18.091 },
  {
    name: "Koszalin",
    region: "zachodniopomorskie",
    lat: 54.1943,
    lng: 16.1715,
  },
  { name: "Legnica", region: "dolnośląskie", lat: 51.207, lng: 16.1619 },
  { name: "Słupsk", region: "pomorskie", lat: 54.4641, lng: 17.0285 },
  { name: "Nowy Sącz", region: "małopolskie", lat: 49.6249, lng: 20.697 },
  { name: "Jelenia Góra", region: "dolnośląskie", lat: 50.9044, lng: 15.7194 },
  { name: "Lubin", region: "dolnośląskie", lat: 51.4009, lng: 16.2015 },
  { name: "Świdnica", region: "dolnośląskie", lat: 50.8433, lng: 16.4887 },
  { name: "Kłodzko", region: "dolnośląskie", lat: 50.4343, lng: 16.6613 },
  { name: "Przemyśl", region: "podkarpackie", lat: 49.7838, lng: 22.7678 },
  { name: "Sopot", region: "pomorskie", lat: 54.4416, lng: 18.5601 },
  { name: "Zakopane", region: "małopolskie", lat: 49.2992, lng: 19.9496 },
];
