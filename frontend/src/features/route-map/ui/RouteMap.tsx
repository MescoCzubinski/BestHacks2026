import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import {
  formatMinutes,
  type RoutePoint,
  type RouteStop,
  type WalkingPath,
} from "@/entities/route";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";

type Props = {
  start: RoutePoint;
  end: RoutePoint;
  stops: RouteStop[];
  path: WalkingPath;
  selectedId?: string;
  onSelect: (id: string) => void;
};

function pin(label: string, active: boolean) {
  return L.divIcon({
    className: active ? "atlas-pin atlas-pin-active" : "atlas-pin",
    html: `<span aria-hidden="true">${label}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

const samePoint = (a: RoutePoint, b: RoutePoint) =>
  a.lat === b.lat && a.lng === b.lng;

function FitRoute({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    map.fitBounds(points, { padding: [48, 48], animate: !reduceMotion });
  }, [map, points]);

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

export function RouteMap({
  start,
  end,
  stops,
  path,
  selectedId,
  onSelect,
}: Props) {
  const line = useMemo(
    () => path.coordinates.map((c) => [c.lat, c.lng] as [number, number]),
    [path],
  );
  const fit = useMemo(
    () =>
      line.length > 0
        ? line
        : stops.map((s) => [s.lat, s.lng] as [number, number]),
    [line, stops],
  );
  const selected = stops.find((s) => s.id === selectedId);
  const round = samePoint(start, end);

  return (
    <div className="relative size-full">
      <MapContainer
        center={[start.lat, start.lng]}
        zoom={14}
        scrollWheelZoom
        className="absolute inset-0 z-0"
        ref={(map: L.Map | null) => {
          const el = map?.getContainer();
          el?.setAttribute("role", "region");
          el?.setAttribute(
            "aria-label",
            "Mapa trasy. Przystanki są dostępne klawiszem Tab, a ich lista jest w panelu po prawej.",
          );
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">współtwórcy OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline
          positions={line}
          pathOptions={{ color: "#6968c3", weight: 4, lineCap: "round" }}
        />
        <Marker
          position={[start.lat, start.lng]}
          icon={pin(round ? "S/K" : "S", false)}
          title={round ? "Start i koniec trasy" : "Start trasy"}
          alt={round ? "Start i koniec trasy" : "Start trasy"}
        />
        {!round && (
          <Marker
            position={[end.lat, end.lng]}
            icon={pin("K", false)}
            title="Koniec trasy"
            alt="Koniec trasy"
          />
        )}
        {stops.map((stop, i) => (
          <Marker
            key={stop.id}
            position={[stop.lat, stop.lng]}
            icon={pin(String(i + 1), stop.id === selectedId)}
            title={`Przystanek ${i + 1}: ${stop.name}`}
            alt={`Przystanek ${i + 1}: ${stop.name}`}
            eventHandlers={{ click: () => onSelect(stop.id) }}
            zIndexOffset={stop.id === selectedId ? 1000 : 0}
          />
        ))}
        <FitRoute points={fit} />
      </MapContainer>

      {selected && (
        <Card
          role="region"
          aria-label="Szczegóły wybranego miejsca"
          aria-live="polite"
          className="absolute bottom-6 left-6 z-[500] w-85 max-w-[calc(100%-3rem)] gap-0 overflow-hidden rounded-2xl py-0 shadow-float"
        >
          <CardHeader className="gap-0.5 px-4 pt-4">
            <h2 className="font-heading text-2xl leading-tight font-extrabold">
              {selected.name}
            </h2>
            <span className="text-sm text-muted-foreground">
              Zwiedzanie: {formatMinutes(selected.visitMinutes)}
            </span>
          </CardHeader>
          <CardContent className="px-4 pt-2 pb-4 text-sm leading-relaxed text-muted-foreground">
            {selected.description}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
