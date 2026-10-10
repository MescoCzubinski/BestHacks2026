import { ArrowDown, ArrowUp, GripVertical, Minus, Plus, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { formatMinutes, type RouteStop } from "@/entities/route";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

/** Small steps for short stops, bigger ones for places people go inside. Down mirrors up. */
const stepUp = (m: number) => (m < 30 ? 5 : 15);
const stepDown = (m: number) => (m <= 30 ? 5 : 15);
const MAX_VISIT = 240;
const MIN_VISIT = 5;

type Props = {
  stops: RouteStop[];
  onMove: (from: number, to: number) => void;
  onRemove: (id: string) => void;
  onSetVisitMinutes: (id: string, minutes: number) => void;
  selectedId?: string;
  onSelect?: (id: string) => void;
  compact?: boolean;
};

export function RouteStopList({
  stops,
  onMove,
  onRemove,
  onSetVisitMinutes,
  selectedId,
  onSelect,
  compact = false,
}: Props) {
  const [drag, setDrag] = useState<{
    id: string;
    grab: number;
    pointerY: number;
  } | null>(null);
  const items = useRef(new Map<string, HTMLLIElement>());
  const tops = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const prev = tops.current;
    const next = new Map<string, number>();
    for (const stop of stops) {
      const el = items.current.get(stop.id);
      if (!el) continue;
      el.style.transition = "none";
      el.style.transform = "";
      const top = el.getBoundingClientRect().top;
      next.set(stop.id, top);
      if (drag?.id === stop.id) {
        el.style.transform = `translateY(${drag.pointerY - drag.grab - top}px)`;
        continue;
      }
      const before = prev.get(stop.id);
      if (before !== undefined && Math.abs(before - top) > 0.5) {
        el.style.transform = `translateY(${before - top}px)`;
        void el.offsetHeight;
        el.style.transition = "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)";
        el.style.transform = "";
      }
    }
    tops.current = next;
  }, [stops, drag]);

  function startDrag(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    if (e.button !== 0) return;
    const el = items.current.get(id);
    if (!el) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({
      id,
      grab: e.clientY - el.getBoundingClientRect().top,
      pointerY: e.clientY,
    });
  }

  function moveDrag(e: React.PointerEvent<HTMLButtonElement>, index: number) {
    if (!drag) return;
    const el = items.current.get(drag.id);
    if (!el) return;
    const center = e.clientY - drag.grab + el.offsetHeight / 2;
    const mid = (i: number) => {
      const other = stops[i] && items.current.get(stops[i].id);
      const top = stops[i] && tops.current.get(stops[i].id);
      return other && top !== undefined ? top + other.offsetHeight / 2 : null;
    };
    const below = mid(index + 1);
    const above = mid(index - 1);
    if (below !== null && center > below) onMove(index, index + 1);
    else if (above !== null && center < above) onMove(index, index - 1);
    setDrag({ ...drag, pointerY: e.clientY });
  }

  function endDrag() {
    if (drag) {
      const el = items.current.get(drag.id);
      if (el) {
        el.style.transition = "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)";
        el.style.transform = "";
      }
    }
    setDrag(null);
  }

  return (
    <ol aria-label="Miejsca na trasie" className="grid gap-2">
      {stops.map((stop, i) => (
        <li
          key={stop.id}
          ref={(el) => {
            if (el) items.current.set(stop.id, el);
            else items.current.delete(stop.id);
          }}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border bg-card p-1.5 shadow-card transition-[box-shadow,scale]",
            selectedId === stop.id && "border-primary",
            drag?.id === stop.id && "relative z-10 scale-[1.02] shadow-float",
          )}
        >
          <button
            type="button"
            aria-label={`Przesuń ${stop.name} (strzałki w górę i w dół)`}
            onPointerDown={(e) => startDrag(e, stop.id)}
            onPointerMove={(e) => moveDrag(e, i)}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                onMove(i, i - 1);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                onMove(i, i + 1);
              }
            }}
            className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand text-xs font-semibold text-brand-foreground"
          >
            {i + 1}
          </span>
          <div className="grid min-w-0 flex-1 gap-1">
            <button
              type="button"
              onClick={() => onSelect?.(stop.id)}
              className="grid min-w-0 rounded-md text-left leading-snug outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <span className="truncate text-sm font-medium">{stop.name}</span>
            </button>
            {
              <div
                role="group"
                aria-label={`Czas zwiedzania: ${stop.name}`}
                className="flex items-center gap-1 text-xs text-muted-foreground"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-7"
                  aria-label={`Skróć zwiedzanie: ${stop.name}`}
                  disabled={stop.visitMinutes <= MIN_VISIT}
                  onClick={() =>
                    onSetVisitMinutes(
                      stop.id,
                      Math.max(
                        MIN_VISIT,
                        stop.visitMinutes - stepDown(stop.visitMinutes),
                      ),
                    )
                  }
                >
                  <Minus />
                </Button>
                <span>zwiedzanie · {formatMinutes(stop.visitMinutes)}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-7"
                  aria-label={`Wydłuż zwiedzanie: ${stop.name}`}
                  disabled={stop.visitMinutes >= MAX_VISIT}
                  onClick={() =>
                    onSetVisitMinutes(
                      stop.id,
                      Math.min(
                        MAX_VISIT,
                        stop.visitMinutes + stepUp(stop.visitMinutes),
                      ),
                    )
                  }
                >
                  <Plus />
                </Button>
              </div>
            }
          </div>
          {!compact && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`${stop.name}: wyżej`}
                disabled={i === 0}
                onClick={() => onMove(i, i - 1)}
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`${stop.name}: niżej`}
                disabled={i === stops.length - 1}
                onClick={() => onMove(i, i + 1)}
              >
                <ArrowDown />
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Usuń ${stop.name} z trasy`}
            onClick={() => onRemove(stop.id)}
          >
            <X />
          </Button>
        </li>
      ))}
    </ol>
  );
}
