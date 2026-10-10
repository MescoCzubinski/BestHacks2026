import { History, RotateCcw } from "lucide-react";
import { SAVED_ROUTES, type SavedRoute } from "@/data/routes";
import { formatMinutes } from "@/entities/route";
import { useTags } from "@/features/pick-interests";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

const dateFmt = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

type Props = {
  onLoad: (route: SavedRoute) => void;
  onBack?: () => void;
};

export function HistoryPanel({ onLoad, onBack }: Props) {
  const { tags } = useTags();
  const tagLabel = (id: string) => tags.find((t) => t.id === id)?.label ?? id;

  return (
    <section aria-labelledby="history-h" className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2
          id="history-h"
          className="flex items-center gap-2 font-heading text-xl font-bold"
        >
          <History className="size-5" /> Twoje poprzednie trasy
        </h2>
        {onBack && (
          <Button type="button" variant="outline" size="sm" onClick={onBack}>
            Wróć do trasy
          </Button>
        )}
      </div>
      <ul className="grid gap-3">
        {SAVED_ROUTES.map((r) => (
          <li key={r.id}>
            <Card className="flex-row items-center gap-3 rounded-2xl p-4 shadow-card">
              <div className="grid min-w-0 flex-1 gap-1.5">
                <h3 className="font-heading text-lg leading-tight font-bold">
                  {r.title}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {dateFmt.format(new Date(`${r.date}T12:00:00`))} ·{" "}
                  {formatMinutes(r.durationMin)} · {r.placeIds.length}{" "}
                  przystanki
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {r.tags.map((t) => (
                    <Badge key={t} variant="outline">
                      {tagLabel(t)}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0"
                onClick={() => onLoad(r)}
                aria-label={`Użyj ponownie trasy ${r.title}`}
              >
                <RotateCcw /> Wczytaj
              </Button>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
