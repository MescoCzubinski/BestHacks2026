export type RecentRoute = {
  id: string;
  title: string;
  date: string;
  tags: string[];
  durationMinutes: number;
  href: string;
  stops: { id: string; name: string }[];
};

type Store = Pick<Storage, "getItem" | "setItem">;

const STORAGE_KEY = "atlas.recent-routes";
const MAX_ROUTES = 20;

function browserStorage(): Store | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function listRecentRoutes(
  storage: Store | null = browserStorage(),
): RecentRoute[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as RecentRoute[]) : [];
  } catch {
    return [];
  }
}

export function saveRecentRoute(
  route: Omit<RecentRoute, "id" | "date">,
  storage: Store | null = browserStorage(),
  now = new Date(),
): RecentRoute {
  const saved: RecentRoute = {
    ...route,
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    date: now.toISOString(),
  };
  const others = listRecentRoutes(storage).filter((r) => r.href !== route.href);
  try {
    storage?.setItem(
      STORAGE_KEY,
      JSON.stringify([saved, ...others].slice(0, MAX_ROUTES)),
    );
  } catch {}
  return saved;
}
