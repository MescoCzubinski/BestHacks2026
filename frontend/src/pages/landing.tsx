import { ArrowRight, Smartphone, TabletSmartphone } from "lucide-react";
import { GridPanel } from "@/shared/grid-panel";
import { Logo } from "@/shared/logo";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import { href } from "@/shared/lib/route";
import { cn } from "@/shared/lib/utils";

const THEMES = ["Art Deco", "Street art", "Gotyk", "Secesja", "+ więcej"];

const STORES = [
  { icon: Smartphone, label: "Pobierz na iPhone'a" },
  { icon: TabletSmartphone, label: "Pobierz na Androida" },
];

export default function Landing() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[2fr_1fr]">
      <main className="flex flex-col justify-between gap-12 px-6 py-5 lg:px-18 lg:py-10">
        <Logo />

        <div className="flex max-w-170 flex-col gap-6 lg:gap-7">
          <h1 className="text-[46px] leading-[1.02] tracking-[-0.03em] lg:text-[76px] lg:leading-none">
            Wybierz motyw.{" "}
            <span className="rounded-md bg-brand px-2 text-brand-foreground lg:px-2.5">
              Zaplanujemy podróż.
            </span>
          </h1>
          <p className="max-w-140 text-base leading-relaxed text-muted-foreground lg:text-lg">
            Od secesji do street artu. Wybierz motyw, a Atlas ułoży trasę
            spacerową po mieście, w którym jesteś.
          </p>

          <ul className="flex flex-wrap gap-2" aria-label="Przykładowe motywy">
            {THEMES.map((t, i) => (
              <li
                key={t}
                className={cn(
                  "rounded-md border px-3 py-1 text-[13px] font-semibold",
                  i === 0 && "bg-accent text-accent-foreground",
                )}
              >
                {t}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {STORES.map(({ icon: Icon, label }) => (
              <Button
                key={label}
                variant="outline"
                className="h-14 justify-start gap-3 rounded-lg px-4"
                aria-disabled
              >
                <Icon className="size-5" />
                <span className="grid text-left leading-tight">
                  <span className="text-xs font-normal text-muted-foreground">
                    Już wkrótce
                  </span>
                  <span className="text-[15px] font-semibold">{label}</span>
                </span>
              </Button>
            ))}
          </div>

          <Separator className="max-w-140">lub</Separator>

          <div>
            <Button asChild size="xl" className="w-full shadow-brand sm:w-auto">
              <a href={href("login")}>
                Użyj w przeglądarce <ArrowRight />
              </a>
            </Button>
          </div>
        </div>

        <p className="text-[13px] text-muted-foreground">
          © 2026 Atlas · Dane mapy © współtwórcy OpenStreetMap
        </p>
      </main>

      <GridPanel />
    </div>
  );
}
