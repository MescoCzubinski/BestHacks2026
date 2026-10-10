import { CITIES, type City } from "../model/cities";

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

/** Cities whose name starts with the query come first, then names that contain it. */
export function matchCities(
  query: string,
  limit = 6,
  cities: City[] = CITIES,
): City[] {
  const q = normalize(query);
  if (!q) return [];
  const starts: City[] = [];
  const contains: City[] = [];
  for (const city of cities) {
    const name = normalize(city.name);
    if (name.startsWith(q)) starts.push(city);
    else if (name.includes(q)) contains.push(city);
  }
  return [...starts, ...contains].slice(0, limit);
}
