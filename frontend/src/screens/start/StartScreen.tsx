import { ArrowRight, Smartphone, TabletSmartphone } from "lucide-react";
import { useState } from "react";
import { GridPanel } from "@/components/GridPanel";
import { Logo } from "@/components/Logo";
import { Button } from "@/ui/button";
import { Separator } from "@/ui/separator";
import { Link } from "@/components/Link";
import { listRecentRoutes } from "@/lib/recentRoutes";
import { RecentRoutes } from "./RecentRoutes";

const STORES = [
  { icon: Smartphone, label: "Pobierz na iPhone'a" },
  { icon: TabletSmartphone, label: "Pobierz na Androida" },
];

export function StartScreen() {
  const [recent] = useState(() => listRecentRoutes());

  return (
    <div className="grid h-dvh overflow-y-auto lg:h-auto lg:min-h-screen lg:grid-cols-[3fr_2fr] lg:overflow-visible">
      <main
        id="main"
        tabIndex={-1}
        className="flex flex-col justify-between gap-12 px-6 py-5 outline-none lg:px-18 lg:py-10 short:gap-6 short:py-3"
      >
        <Logo className="self-start" />

        <div className="my-auto flex max-w-full flex-col gap-6 lg:gap-7 short:gap-4">
          <h1 className="text-[8vw] leading-[1.5] tracking-normal lg:text-[72px]">
            Wybierz motyw.{" "}
            <span className="rounded-md bg-brand box-decoration-clone px-3 whitespace-nowrap text-brand-foreground">
              Zaplanujemy podróż.
            </span>
          </h1>
          <p className="max-w-140 text-base leading-relaxed text-muted-foreground lg:text-lg">
            Od secesji do street artu. Wybierz motyw, a Atlas ułoży trasę
            spacerową po mieście, w którym jesteś.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {STORES.map(({ icon: Icon, label }) => (
              <Button
                key={label}
                variant="outline"
                className="h-14 justify-start gap-3 rounded-lg px-4 short:h-12"
                type="button"
                aria-disabled
              >
                <Icon className="size-5" />
                <span className="grid text-left leading-tight">
                  <span className="text-xs font-normal text-muted-foreground">
                    Już wkrótce
                  </span>
                  <span className="text-base font-semibold">{label}</span>
                </span>
              </Button>
            ))}
          </div>

          <Separator className="max-w-140">lub</Separator>

          <div>
            <Button asChild size="xl" className="w-full shadow-brand sm:w-auto">
              <Link to="/plan">
                Użyj w przeglądarce <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {recent.length > 0 ? (
        <aside
          aria-label="Ostatnie trasy"
          className="min-w-0 border-t bg-grid p-4 lg:overflow-y-auto lg:border-t-0 lg:border-l lg:p-6"
        >
          <RecentRoutes routes={recent} />
        </aside>
      ) : (
        <GridPanel className="hidden lg:flex" />
      )}
    </div>
  );
}
