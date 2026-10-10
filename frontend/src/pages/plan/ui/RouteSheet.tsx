import { ChevronUp } from "lucide-react";
import { useState } from "react";
import {
  formatDistance,
  formatMinutes,
  routeTotals,
  type RouteStop,
  type WalkingPath,
} from "@/entities/route";
import { Collapse } from "@/shared/ui/collapse";
import { cn } from "@/shared/lib/utils";

type Props = {
  stops: RouteStop[];
  path: WalkingPath;
  onPick: (id: string) => void;
};

/** Mobile bottom drawer over the map: route summary always visible, places listed when expanded. */
export function RouteSheet({ stops, path, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const totals = routeTotals(path, stops);

  return (
    <section
      aria-label="Szczegóły trasy"
      className="absolute inset-x-0 bottom-0 z-[500] rounded-t-2xl border border-b-0 bg-card text-card-foreground shadow-float lg:hidden"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="route-sheet-body"
        onClick={() => setOpen(!open)}
        className="grid w-full gap-1 rounded-t-2xl px-4 pt-2 pb-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span
          aria-hidden="true"
          className="mx-auto h-1.5 w-10 rounded-full bg-border"
        />
        <span className="flex items-center justify-between gap-2">
          <span className="grid leading-snug">
            <span className="font-heading text-lg font-bold">
              Szczegóły trasy
            </span>
            <span className="text-sm text-muted-foreground">
              {formatDistance(path.distanceMeters)} pieszo · razem{" "}
              {formatMinutes(totals.totalMinutes)}
            </span>
          </span>
          <ChevronUp
            aria-hidden="true"
            className={cn(
              "size-5 shrink-0 text-muted-foreground transition-transform duration-300",
              open && "rotate-180",
            )}
          />
        </span>
      </button>
      <div id="route-sheet-body">
        <Collapse open={open}>
          <div className="grid max-h-[50dvh] gap-3 overflow-y-auto border-t px-4 py-3">
            <dl className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
              {[
                ["Spacer", formatMinutes(totals.walkingMinutes)],
                ["Zwiedzanie", formatMinutes(totals.visitMinutes)],
                ["Razem", formatMinutes(totals.totalMinutes)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-secondary p-2">
                  <dt>{label}</dt>
                  <dd className="text-sm font-semibold text-foreground">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <ol aria-label="Miejsca na trasie" className="grid gap-2">
              {stops.map((stop, i) => (
                <li key={stop.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onPick(stop.id);
                    }}
                    className="flex min-h-11 w-full items-center gap-2 rounded-xl border bg-background p-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand text-xs font-semibold text-brand-foreground"
                    >
                      {i + 1}
                    </span>
                    <span className="grid min-w-0 flex-1 leading-snug">
                      <span className="truncate text-sm font-medium">
                        {stop.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatMinutes(stop.visitMinutes)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </Collapse>
      </div>
    </section>
  );
}
