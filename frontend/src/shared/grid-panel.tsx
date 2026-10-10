import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

/**
 * Photos in public/img come from Unsplash (https://unsplash.com), free to use
 * under the Unsplash License (https://unsplash.com/license), no attribution
 * required: neonside.jpg, stare-miasto-drzwi.jpg, modernizm.jpg.
 */
function Photo({
  src,
  alt,
  position,
}: {
  src: string;
  alt: string;
  position: string;
}) {
  return (
    <div className="absolute inset-0">
      <img
        src={src}
        alt={alt}
        className={cn("size-full object-cover", position)}
      />
    </div>
  );
}

const CARDS: {
  title: string;
  subtitle: string;
  bg: string;
  art: ReactNode;
}[] = [
  {
    title: "Neonside",
    subtitle: "Street art",
    bg: "bg-brand",
    art: (
      <Photo
        src="/img/neonside.jpg"
        alt="Zaułek Neonside we Wrocławiu wieczorem"
        position="object-[50%_70%]"
      />
    ),
  },
  {
    title: "Portal",
    subtitle: "Stare Miasto",
    bg: "bg-accent",
    art: (
      <Photo
        src="/img/stare-miasto-drzwi.jpg"
        alt="Zdobiony niebiesko-złoty portal na Starym Mieście we Wrocławiu"
        position="object-[50%_35%]"
      />
    ),
  },
  {
    title: "Modernizm",
    subtitle: "Beton i szkło",
    bg: "bg-brand",
    art: (
      <Photo
        src="/img/modernizm.jpg"
        alt="Konstruktywistyczny budynek ze szkła i betonu we Wrocławiu"
        position="object-[50%_30%]"
      />
    ),
  },
];

export function GridPanel({ className }: { className?: string }) {
  return (
    <section
      aria-label="Przykładowe miejsca"
      data-idle="on"
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden border-t bg-grid px-[var(--grid-size)] pt-[var(--grid-size)] pb-[var(--grid-size)] lg:border-t-0 lg:border-l",
        className,
      )}
    >
      {CARDS.map((c, i) => (
        <article
          key={c.title}
          style={{ zIndex: i === 1 ? 2 : 1 }}
          className={cn(
            "idle-card",
            i > 0 && "-mt-[calc(var(--grid-size)*2)]",
            i % 2 === 0
              ? "-translate-x-[calc(var(--grid-size)*2)]"
              : "translate-x-[calc(var(--grid-size)*2)]",
            "flex h-[calc(var(--grid-size)*9)] w-[calc(var(--grid-size)*9)] shrink-0 flex-col overflow-hidden rounded-md border bg-card shadow-card",
          )}
        >
          <div className={cn("relative min-h-0 flex-1", c.bg)}>{c.art}</div>
          <div className="flex h-[calc(var(--grid-size)*2)] items-center border-t px-4">
            <div className="grid leading-tight">
              <span className="text-base font-semibold">{c.title}</span>
              <span className="text-sm text-muted-foreground">
                {c.subtitle}
              </span>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
