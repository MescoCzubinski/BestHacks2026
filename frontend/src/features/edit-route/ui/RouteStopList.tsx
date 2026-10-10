import { ArrowDown, ArrowUp, GripVertical, X } from "lucide-react";
import { useState } from "react";
import { formatMinutes, type RouteStop } from "@/entities/route";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

type Props = {
  stops: RouteStop[];
  onMove: (from: number, to: number) => void;
  onRemove: (id: string) => void;
  selectedId?: string;
  onSelect?: (id: string) => void;
  compact?: boolean;
};

export function RouteStopList({
  stops,
  onMove,
  onRemove,
  selectedId,
  onSelect,
  compact = false,
}: Props) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function endDrag() {
    setDragFrom(null);
    setDragOver(null);
  }

  return (
    <ol aria-label="Miejsca na trasie" className="grid gap-2">
      {stops.map((stop, i) => (
        <li
          key={stop.id}
          draggable
          onDragStart={(e) => {
            setDragFrom(i);
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(i);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragFrom !== null) onMove(dragFrom, i);
            endDrag();
          }}
          onDragEnd={endDrag}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border bg-card p-1.5 shadow-card",
            selectedId === stop.id && "border-primary",
            dragFrom === i && "opacity-50",
            dragOver === i && dragFrom !== i && "ring-2 ring-ring",
          )}
        >
          <button
            type="button"
            aria-label={`Przesuń ${stop.name} (strzałki w górę i w dół)`}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                onMove(i, i - 1);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                onMove(i, i + 1);
              }
            }}
            className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand text-xs font-semibold text-brand-foreground"
          >
            {i + 1}
          </span>
          <button
            type="button"
            onClick={() => onSelect?.(stop.id)}
            className="grid min-w-0 flex-1 rounded-md text-left leading-snug outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <span className="truncate text-sm font-medium">{stop.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatMinutes(stop.visitMinutes)}
            </span>
          </button>
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
