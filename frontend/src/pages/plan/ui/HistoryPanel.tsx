import { ArrowLeft, ChevronDown } from "lucide-react";
import { useState } from "react";
import { PLACES } from "@/data/places";
import { SAVED_ROUTES } from "@/data/routes";
import { formatMinutes } from "@/entities/route";
import { useTags } from "@/features/pick-interests";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Collapse } from "@/shared/ui/collapse";
import { cn } from "@/shared/lib/utils";

const dateFmt = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

type Props = {
  onBack?: () => void;
};

export function HistoryPanel({ onBack }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { tags } = useTags();
  const placeName = (id: string) => PLACES.find((p) => p.id === id)?.name ?? id;
  const tagLabel = (id: string) => tags.find((t) => t.id === id)?.label ?? id;

  return (
    <section aria-labelledby="history-h" className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2
          id="history-h"
          className="flex items-center gap-2 font-heading text-xl font-bold"
        >
          Twoje poprzednie trasy
        </h2>
        {onBack && (
          <Button type="button" variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft /> Wróć do trasy
          </Button>
        )}
      </div>
      <ul className="grid gap-3">
        {SAVED_ROUTES.map((r) => {
          const open = openId === r.id;
          return (
            <li key={r.id}>
              <Card className="gap-0 overflow-hidden rounded-2xl p-0 shadow-card">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`stops-${r.id}`}
                  onClick={() => setOpenId(open ? null : r.id)}
                  className="flex w-full items-center gap-3 p-4 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <span className="grid min-w-0 flex-1 gap-1.5">
                    <span className="font-heading text-lg leading-tight font-bold">
                      {r.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {r.city} ·{" "}
                      {dateFmt.format(new Date(`${r.date}T12:00:00`))} ·{" "}
                      {formatMinutes(r.durationMin)} · {r.placeIds.length}{" "}
                      przystanki
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {r.tags.map((t) => (
                        <Badge key={t} variant="outline">
                          {tagLabel(t)}
                        </Badge>
                      ))}
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "size-5 shrink-0 text-muted-foreground transition-transform duration-300",
                      open && "rotate-180",
                    )}
                  />
                </button>
                <div id={`stops-${r.id}`}>
                  <Collapse open={open}>
                    <ol
                      aria-label={`Przystanki: ${r.title}`}
                      className="grid gap-2 border-t px-4 py-3"
                    >
                      {r.placeIds.map((id, i) => (
                        <li
                          key={id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span
                            aria-hidden="true"
                            className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand text-xs font-semibold text-brand-foreground"
                          >
                            {i + 1}
                          </span>
                          {placeName(id)}
                        </li>
                      ))}
                    </ol>
                  </Collapse>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
