import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronsUpDown, LogOut, MapPin, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import { Logo } from "@/components/logo";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CITY, PLACES, type Category } from "@/data/places";
import { href } from "@/lib/route";
import { cn } from "@/lib/utils";

const FILTERS: { id: "all" | Category; label: string }[] = [
  { id: "all", label: "Wszystko" },
  { id: "sights", label: "Zabytki" },
  { id: "parks", label: "Parki" },
];

function pinIcon(n: number, active: boolean) {
  return L.divIcon({
    className: active ? "atlas-pin atlas-pin-active" : "atlas-pin",
    html: `<span>${n}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [lat, lng, map]);
  return null;
}

export default function MapApp() {
  const [selectedId, setSelectedId] = useState(PLACES[0].id);
  const [filter, setFilter] = useState<"all" | Category>("all");
  const [query, setQuery] = useState("");

  const selected = PLACES.find((p) => p.id === selectedId) ?? PLACES[0];

  const visible = useMemo(
    () =>
      PLACES.filter(
        (p) =>
          (filter === "all" || p.category === filter) &&
          p.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [filter, query],
  );

  return (
    <div className="flex min-h-screen flex-col-reverse lg:grid lg:h-screen lg:grid-cols-[1fr_4fr]">
      <h1 className="sr-only">Mapa Atlasa</h1>

      {/* Sidebar (1/5 on desktop, sheet below the map on mobile) */}
      <aside className="flex min-h-0 flex-col border-t bg-background lg:border-t-0 lg:border-r">
        <div className="p-4">
          <Logo size="sm" />
        </div>

        <div className="grid gap-3 px-4 pb-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" />
            <label htmlFor="q" className="sr-only">
              Szukaj miejsc
            </label>
            <Input
              id="q"
              type="search"
              placeholder="Szukaj we Wrocławiu…"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-0.5 rounded-lg bg-muted p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "h-11 rounded-md text-xs font-medium text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  filter === f.id && "bg-background text-foreground shadow-xs",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Jesteś w
            </span>
            <div className="flex h-11 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium">
              <MapPin className="size-4" />
              <span className="flex-1">{CITY.name}</span>
              <span className="text-xs font-normal text-muted-foreground">
                auto
              </span>
            </div>
            <span className="mt-1 text-xs font-medium text-muted-foreground">
              Motyw
            </span>
            <button
              type="button"
              aria-label="Wybierz motyw"
              className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-accent px-3 text-sm font-semibold text-accent-foreground shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Art Deco <ChevronsUpDown className="size-4" />
            </button>
          </div>
        </div>

        <Separator />
        <p className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground">
          Trasa Art Deco · {PLACES.length} przystanków
        </p>

        <ul className="flex-1 overflow-auto px-2 pb-2">
          {visible.map((p) => {
            const n = PLACES.indexOf(p) + 1;
            const active = p.id === selectedId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md border border-transparent p-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    active && "border-primary bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-md border text-xs font-semibold",
                      active && "border-brand bg-brand text-brand-foreground",
                    )}
                  >
                    {n}
                  </span>
                  <span className="grid min-w-0 flex-1 leading-snug">
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.tag}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <Separator />
        <div className="flex items-center gap-3 px-4 py-3">
          <Avatar>AK</Avatar>
          <span className="grid min-w-0 flex-1 leading-snug">
            <span className="text-sm font-medium">Anna Kowalska</span>
            <span className="text-xs text-muted-foreground">Odkrywca</span>
          </span>
          <Button asChild variant="ghost" size="icon-lg" aria-label="Wyloguj">
            <a href={href("landing")}>
              <LogOut />
            </a>
          </Button>
        </div>
      </aside>

      {/* Map (4/5 on desktop, top of the screen on mobile) */}
      <main className="relative h-[60vh] lg:h-auto">
        <MapContainer
          center={[CITY.lat, CITY.lng]}
          zoom={14}
          scrollWheelZoom
          className="absolute inset-0 z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">współtwórcy OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Polyline
            positions={PLACES.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{
              color: "#6968c3",
              weight: 4,
              dashArray: "2 8",
              lineCap: "round",
            }}
          />
          {PLACES.map((p, i) => (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={pinIcon(i + 1, p.id === selectedId)}
              eventHandlers={{ click: () => setSelectedId(p.id) }}
              zIndexOffset={p.id === selectedId ? 1000 : 0}
            />
          ))}
          <FlyTo lat={selected.lat} lng={selected.lng} />
        </MapContainer>

        <Card className="absolute bottom-6 left-6 z-[500] w-85 max-w-[calc(100%-3rem)] gap-0 overflow-hidden rounded-2xl py-0 shadow-float">
          <CardHeader className="flex-row items-start justify-between gap-2 px-4 pt-4">
            <div className="grid gap-0.5">
              <span className="font-heading text-2xl leading-tight font-extrabold">
                {selected.name}
              </span>
              <span className="text-[13px] text-muted-foreground">
                {selected.tag}
              </span>
            </div>
            <Badge variant="outline">{PLACES.indexOf(selected) + 1}</Badge>
          </CardHeader>
          <CardContent className="px-4 pt-2 text-sm leading-relaxed text-muted-foreground">
            {selected.blurb}
          </CardContent>
          <CardFooter className="gap-2 p-4">
            <Button className="h-11 flex-1">Wyznacz trasę</Button>
            <Button variant="outline" className="h-11 flex-1">
              Dodaj do podróży
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
