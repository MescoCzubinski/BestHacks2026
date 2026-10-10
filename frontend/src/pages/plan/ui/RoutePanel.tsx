import { History } from "lucide-react";
import {
  formatDistance,
  formatMinutes,
  routeTotals,
  type RouteStop,
} from "@/entities/route";
import {
  AddPlaces,
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
  onAdd: (stop: RouteStop, index?: number) => void;
  onSetVisitMinutes: (id: string, minutes: number) => void;
  onSwap: (removeIds: string[], stop?: RouteStop, index?: number) => void;
  onExtendTime: (minutes: number) => void;
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
  onSwap,
  onSetVisitMinutes,
  onExtendTime,
  onAccept,
  onShowHistory,
}: Props) {
  const totals = routeTotals(route.path, route.stops);
  const overBy = totals.totalMinutes - availableMinutes;

  return (
    <section
      aria-labelledby="route-h"
      className="flex min-h-full flex-col justify-between gap-6"
    >
      <div className="grid gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="route-h" className="font-heading text-xl font-bold">
            {compact ? "Twoja trasa" : "Proponowana trasa"}
          </h2>
          {!compact && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Poprzednie trasy"
              onClick={onShowHistory}
            >
              <History />
              Poprzednie trasy
            </Button>
          )}
        </div>

        {!compact && (
          <AddPlaces
            route={route}
            availableMinutes={availableMinutes}
            totalMinutes={totals.totalMinutes}
            onAdd={onAdd}
            onSwap={onSwap}
            onExtendTime={onExtendTime}
          />
        )}
      </div>

      {route.stops.length === 0 ? (
        <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
          Trasa nie ma jeszcze miejsc. Dodaj je powyżej.
        </p>
      ) : (
        <RouteStopList
          stops={route.stops}
          onMove={onMove}
          onRemove={onRemove}
          onSetVisitMinutes={onSetVisitMinutes}
          selectedId={selectedId}
          onSelect={onSelect}
          compact={compact}
        />
      )}

      <div className="grid gap-4">
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
      </div>
    </section>
  );
}
