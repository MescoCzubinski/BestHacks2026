import type { ReactNode } from "react";
import {
  HalaIllustration,
  RynekIllustration,
  TumskiIllustration,
} from "@/shared/illustrations";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";

const CARDS: {
  n: string;
  title: string;
  subtitle: string;
  bg: string;
  art: ReactNode;
  offset?: boolean;
}[] = [
  {
    n: "01",
    title: "Rynek",
    subtitle: "Stare Miasto",
    bg: "bg-accent",
    art: <RynekIllustration />,
  },
  {
    n: "02",
    title: "Hala Stulecia",
    subtitle: "Wpis UNESCO",
    bg: "bg-brand",
    art: <HalaIllustration />,
    offset: true,
  },
  {
    n: "03",
    title: "Ostrów Tumski",
    subtitle: "Wyspa Katedralna",
    bg: "bg-accent",
    art: <TumskiIllustration />,
  },
];

/** 35px grid with the landmark cards snapped to it (8 x 6 cells each). */
export function GridPanel({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-[var(--grid-size)] overflow-hidden border-t bg-grid px-[var(--grid-size)] pt-[var(--grid-size)] pb-[var(--grid-size)] lg:border-t-0 lg:border-l lg:pt-[calc(var(--grid-size)*3)]",
        className,
      )}
    >
      {CARDS.map((c) => (
        <article
          key={c.n}
          className={cn(
            "flex h-[calc(var(--grid-size)*6)] w-[calc(var(--grid-size)*8)] shrink-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-card",
            c.offset && "ml-[var(--grid-size)]",
          )}
        >
          <div className={cn("h-[calc(var(--grid-size)*4)] border-b", c.bg)}>
            {c.art}
          </div>
          <div className="flex flex-1 items-center justify-between px-4">
            <div className="grid leading-tight">
              <span className="text-[15px] font-semibold">{c.title}</span>
              <span className="text-[13px] text-muted-foreground">
                {c.subtitle}
              </span>
            </div>
            <Badge variant="outline">{c.n}</Badge>
          </div>
        </article>
      ))}
    </div>
  );
}
