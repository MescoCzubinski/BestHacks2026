import { History } from "lucide-react";
import {
  formatDistance,
  formatMinutes,
  routeTotals,
  type RouteStop,
} from "@/entities/route";
import {
  PlaceSearch,
  RouteStopList,
  type EditableRoute,
} from "@/features/edit-route";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

type Props = {
  route: EditableRoute;
  recalculating: boolean;
  error: string;
  availableMinutes: number;
  compact: boolean;
  selectedId?: string;
  onSelect: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (id: string) => void;
  onAdd: (stop: RouteStop) => void;
  onAccept: () => void;
  onShowHistory: () => void;
};

export function RoutePanel({
  route,
  recalculating,
  error,
  availableMinutes,
  compact,
  selectedId,
  onSelect,
  onMove,
  onRemove,
  onAdd,
  onAccept,
  onShowHistory,
}: Props) {
  const totals = routeTotals(route.path, route.stops);
  const overBy = totals.totalMinutes - availableMinutes;

  return (
    <section aria-labelledby="route-h" className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="route-h" className="font-heading text-xl font-bold">
          {compact ? "Twoja trasa" : "Proponowana trasa"}
        </h2>
        <Button
          type="button"
          variant="outline"
          size={compact ? "icon" : "sm"}
          aria-label="Poprzednie trasy"
          onClick={onShowHistory}
        >
          <History />
          {!compact && "Poprzednie trasy"}
        </Button>
      </div>

      <div
        aria-live="polite"
        className={cn(
          "grid gap-0.5 rounded-xl border bg-card p-3 text-sm shadow-card",
          recalculating && "opacity-60",
        )}
      >
        <span className="font-medium">
          {formatDistance(route.path.distanceMeters)} pieszo ·{" "}
          {formatMinutes(totals.walkingMinutes)}
        </span>
        <span className="text-muted-foreground">
          Zwiedzanie: {formatMinutes(totals.visitMinutes)}
        </span>
        <span className="font-medium">
          Razem: {formatMinutes(totals.totalMinutes)}
          {recalculating && " (przeliczamy…)"}
        </span>
        {overBy > 0 && (
          <span className="text-destructive">
            O {formatMinutes(overBy)} dłużej niż Twój czas (
            {formatMinutes(availableMinutes)}).
          </span>
        )}
        {error && <span className="text-destructive">{error}</span>}
      </div>

      {route.stops.length === 0 ? (
        <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
          Trasa nie ma jeszcze miejsc. Dodaj je wyszukiwarką poniżej.
        </p>
      ) : (
        <RouteStopList
          stops={route.stops}
          onMove={onMove}
          onRemove={onRemove}
          selectedId={selectedId}
          onSelect={onSelect}
          compact={compact}
        />
      )}

      <PlaceSearch onAdd={onAdd} existingIds={route.stops.map((s) => s.id)} />

      {!compact && (
        <Button
          type="button"
          variant="brand"
          size="xl"
          className="w-full"
          onClick={onAccept}
        >
          Zaakceptuj trasę
        </Button>
      )}
    </section>
  );
}
