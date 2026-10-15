import { ArrowRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link } from "@/components/Link";
import { useTags } from "@/hooks/useTags";
import { formatMinutes } from "@/lib/format";
import type { RecentRoute } from "@/lib/recentRoutes";
import { cn } from "@/lib/utils";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { Collapse } from "@/ui/collapse";

const dateFmt = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

type Props = {
  routes: RecentRoute[];
};

export function RecentRoutes({ routes }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { tags } = useTags();
  const tagLabel = (id: string) => tags.find((t) => t.id === id)?.label ?? id;

  return (
    <section aria-labelledby="recent-h" className="grid gap-4">
      <h2 id="recent-h" className="font-heading text-xl font-bold">
        Twoje ostatnie trasy
      </h2>
      <p className="text-sm text-muted-foreground">
        Zapisane tylko w tej przeglądarce.
      </p>
      <ul className="grid gap-3">
        {routes.map((r) => {
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
                      {dateFmt.format(new Date(r.date))} ·{" "}
                      {formatMinutes(r.durationMinutes)} · {r.stops.length}{" "}
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
                    <div className="grid gap-3 border-t px-4 py-3">
                      <ol
                        aria-label={`Przystanki: ${r.title}`}
                        className="grid gap-2"
                      >
                        {r.stops.map((stop, i) => (
                          <li
                            key={`${stop.id}-${i}`}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span
                              aria-hidden="true"
                              className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand text-xs font-semibold text-brand-foreground"
                            >
                              {i + 1}
                            </span>
                            {stop.name}
                          </li>
                        ))}
                      </ol>
                      <Button asChild variant="outline" size="sm">
                        <Link to={r.href}>
                          Ułóż tę trasę ponownie <ArrowRight />
                        </Link>
                      </Button>
                    </div>
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
