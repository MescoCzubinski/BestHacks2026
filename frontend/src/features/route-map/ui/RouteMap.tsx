import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { useIsDesktop } from "@/shared/lib/useIsDesktop";
import { Button } from "@/shared/ui/button";
import { Modal } from "@/shared/ui/modal";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";

type Props = {
  start: RoutePoint;
  end: RoutePoint;
  stops: RouteStop[];
  path: WalkingPath;
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
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

type Corner = "bl" | "br" | "tl" | "tr";

const CORNER_CLASS: Record<Corner, string> = {
  bl: "bottom-6 left-6",
  br: "bottom-6 right-6",
  tl: "top-16 left-6",
  tr: "top-28 right-6",
};

const CARD_WIDTH = 340;
const CARD_MARGIN = 24;
const TOP_LEFT_Y = 64; // below the "change route" button
const TOP_RIGHT_Y = 112; // below the zoom buttons

/** Picks the corner whose card would cover the fewest route points and pins. */
function CardPlacement({
  line,
  pins,
  height,
  onPlace,
}: {
  line: [number, number][];
  pins: [number, number][];
  height: number;
  onPlace: (corner: Corner) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const choose = () => {
      const { x: w, y: h } = map.getSize();
      const rects: Record<Corner, [number, number]> = {
        bl: [CARD_MARGIN, h - CARD_MARGIN - height],
        br: [w - CARD_MARGIN - CARD_WIDTH, h - CARD_MARGIN - height],
        tl: [CARD_MARGIN, TOP_LEFT_Y],
        tr: [w - CARD_MARGIN - CARD_WIDTH, TOP_RIGHT_Y],
      };
      const covered = (pts: [number, number][], [x, y]: [number, number]) =>
        pts.filter((p) => {
          const c = map.latLngToContainerPoint(p);
          return (
            c.x >= x - 8 &&
            c.x <= x + CARD_WIDTH + 8 &&
            c.y >= y - 8 &&
            c.y <= y + height + 8
          );
        }).length;
      let best: Corner = "bl";
      let bestCost = Infinity;
      for (const corner of ["bl", "br", "tl", "tr"] as Corner[]) {
        const cost =
          covered(line, rects[corner]) + 50 * covered(pins, rects[corner]);
        if (cost < bestCost) {
          best = corner;
          bestCost = cost;
        }
      }
      onPlace(best);
    };
    choose();
    map.on("moveend zoomend resize", choose);
    return () => {
      map.off("moveend zoomend resize", choose);
    };
  }, [map, line, pins, height, onPlace]);

  return null;
}

function ZoomButtons() {
  const map = useMap();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) L.DomEvent.disableClickPropagation(ref.current);
  }, []);

  return (
    <div ref={ref} className="absolute top-3 right-3 z-[1000] grid gap-2">
      {[
        { label: "Przybliż mapę", Icon: Plus, zoom: () => map.zoomIn() },
        { label: "Oddal mapę", Icon: Minus, zoom: () => map.zoomOut() },
      ].map(({ label, Icon, zoom }) => (
        <Button
          key={label}
          type="button"
          variant="outline"
          size="icon"
          aria-label={label}
          className="size-10 bg-background shadow-float"
          onClick={zoom}
        >
          <Icon />
        </Button>
      ))}
    </div>
  );
}

function PlaceDetails({ place }: { place: RouteStop }) {
  return (
    <>
      <CardHeader className="gap-0.5 px-4 pt-4">
        <h2 className="font-heading text-2xl leading-tight font-extrabold">
          {place.name}
        </h2>
        <span className="text-sm text-muted-foreground">
          Zwiedzanie: {formatMinutes(place.visitMinutes)}
        </span>
      </CardHeader>
      <CardContent className="px-4 pt-2 pb-4 text-sm leading-relaxed text-muted-foreground">
        {place.description}
      </CardContent>
    </>
  );
}

function PlaceDialog({
  place,
  onClose,
}: {
  place: RouteStop;
  onClose: () => void;
}) {
  return (
    <Modal label={place.name} onClose={onClose}>
      <div className="pr-10">
        <PlaceDetails place={place} />
      </div>
    </Modal>
  );
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
  const desktop = useIsDesktop();
  const [corner, setCorner] = useState<Corner>("bl");
  const pins = useMemo(
    () => [start, end, ...stops].map((p) => [p.lat, p.lng] as [number, number]),
    [start, end, stops],
  );
  const cardHeight = selected
    ? 110 + Math.ceil(selected.description.length / 42) * 22
    : 0;
  const round = samePoint(start, end);

  return (
    <div className="relative size-full">
      <MapContainer
        center={[start.lat, start.lng]}
        zoom={14}
        scrollWheelZoom
        zoomControl={false}
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
        <ZoomButtons />
        {selected && desktop && (
          <CardPlacement
            line={line}
            pins={pins}
            height={cardHeight}
            onPlace={setCorner}
          />
        )}
      </MapContainer>

      {selected &&
        (desktop ? (
          <Card
            role="region"
            aria-label="Szczegóły wybranego miejsca"
            aria-live="polite"
            className={cn(
              "absolute z-[500] w-85 max-w-[calc(100%-3rem)] gap-0 overflow-hidden rounded-2xl py-0 shadow-float transition-all duration-300",
              CORNER_CLASS[corner],
            )}
          >
            <PlaceDetails place={selected} />
          </Card>
        ) : (
          <PlaceDialog place={selected} onClose={() => onSelect(undefined)} />
        ))}
    </div>
  );
}
