import { ArrowLeft, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createRoute } from "@/api/createRoute";
import { RouteRequestError } from "@/api/errors";
import { Link } from "@/components/Link";
import { useLocation } from "@/hooks/useLocation";
import { useTags } from "@/hooks/useTags";
import { saveRecentRoute } from "@/lib/recentRoutes";
import { parseRoutePlan, planHref, type RoutePlan } from "@/lib/routePlan";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { RouteMap } from "./RouteMap";
import { RoutePanel } from "./RoutePanel";
import { RouteSheet } from "./RouteSheet";
import { useEditableRoute } from "./useEditableRoute";

type Phase = "proposal" | "accepted";

const COLUMNS: Record<Phase, string> = {
  proposal: "3fr 2fr",
  accepted: "4fr 1fr",
};

const DESKTOP_QUERY = "(min-width: 1024px)";

function toRequest(plan: RoutePlan) {
  const point = ({ lat, lng }: { lat: number; lng: number }) => ({ lat, lng });
  return {
    start: point(plan.start),
    end: plan.end && point(plan.end),
    durationMinutes: plan.durationMinutes,
    wheelchair: plan.wheelchair,
    tags: plan.tags,
  };
}

export function RouteScreen() {
  const { search } = useLocation();
  const plan = useMemo(() => parseRoutePlan(search), [search]);
  return plan ? (
    <PlannedRoute key={search} plan={plan} search={search} />
  ) : (
    <InvalidLink />
  );
}

function InvalidLink() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto grid min-h-dvh max-w-md content-center gap-4 p-6 outline-none"
    >
      <h1 className="font-heading text-2xl font-bold">
        Ten link nie opisuje trasy
      </h1>
      <p className="text-sm text-muted-foreground">
        Brakuje motywów, punktu startu albo czasu. Zaplanuj trasę od nowa.
      </p>
      <Button asChild variant="brand" size="xl">
        <Link to="/plan">Zaplanuj trasę</Link>
      </Button>
    </main>
  );
}

function PlannedRoute({ plan, search }: { plan: RoutePlan; search: string }) {
  const [phase, setPhase] = useState<Phase>("proposal");
  const [attempt, setAttempt] = useState(0);
  const [failure, setFailure] = useState("");
  const [availableMinutes, setAvailableMinutes] = useState(
    plan.durationMinutes,
  );
  const [selectedId, setSelectedId] = useState<string>();
  const editor = useEditableRoute();
  const { tags } = useTags();
  const route = editor.route;
  const load = editor.load;

  useEffect(() => {
    const controller = new AbortController();
    const request = toRequest(plan);
    createRoute(request, controller.signal)
      .then((built) =>
        load({
          start: request.start,
          end: request.end ?? request.start,
          stops: built.stops,
          extras: built.extras,
          path: built.path,
        }),
      )
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setFailure(
          e instanceof RouteRequestError
            ? e.message
            : "Nie udało się ułożyć trasy.",
        );
      });
    return () => controller.abort();
  }, [plan, load, attempt]);

  function retry() {
    setFailure("");
    setAttempt((n) => n + 1);
  }

  function accept() {
    if (!route) return;
    const labels = plan.tags.map(
      (id) => tags.find((t) => t.id === id)?.label ?? id,
    );
    saveRecentRoute({
      title: labels.join(", ") || "Trasa",
      tags: plan.tags,
      durationMinutes: availableMinutes,
      href: `/route${search}`,
      stops: route.stops.map(({ id, name }) => ({ id, name })),
    });
    const desktop = window.matchMedia(DESKTOP_QUERY).matches;
    setSelectedId(desktop ? route.stops[0]?.id : undefined);
    setPhase("accepted");
  }

  const changeLink = (
    <Button
      asChild
      variant="outline"
      className="h-10 bg-background shadow-float"
    >
      <Link to={planHref(plan)}>
        <ArrowLeft /> Zmień dane trasy
      </Link>
    </Button>
  );

  if (failure) {
    return (
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto grid min-h-dvh max-w-md content-center gap-4 p-6 outline-none"
      >
        <h1 className="font-heading text-2xl font-bold">
          Nie udało się ułożyć trasy
        </h1>
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="brand" onClick={retry}>
            <RotateCcw /> Spróbuj ponownie
          </Button>
          {changeLink}
        </div>
      </main>
    );
  }

  if (!route) {
    return (
      <main
        id="main"
        tabIndex={-1}
        aria-busy="true"
        className="grid min-h-dvh outline-none lg:h-screen lg:grid-cols-[3fr_2fr]"
      >
        <div className="hidden animate-pulse bg-secondary lg:block" />
        <div className="grid content-start gap-4 border-l bg-grid p-4 lg:p-6">
          <p role="status" className="font-heading text-xl font-bold">
            Układamy trasę…
          </p>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-card shadow-card"
            />
          ))}
        </div>
      </main>
    );
  }

  const accepted = phase === "accepted";

  return (
    <main
      id="main"
      tabIndex={-1}
      style={{ "--cols": COLUMNS[phase] } as React.CSSProperties}
      className="grid bg-background transition-[grid-template-columns] duration-500 ease-in-out outline-none motion-reduce:transition-none max-lg:h-dvh max-lg:overflow-hidden lg:h-screen lg:grid-cols-[var(--cols)]"
    >
      <div
        className={cn(
          "relative min-w-0 max-lg:min-h-0",
          !accepted && "hidden lg:block",
        )}
      >
        <div className="relative h-dvh lg:h-full">
          <RouteMap
            start={route.start}
            end={route.end}
            stops={route.stops}
            path={route.path}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <div className="absolute top-3 left-3 z-[500]">
            {accepted ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 bg-background shadow-float"
                onClick={() => setPhase("proposal")}
              >
                <ArrowLeft /> Edytuj trasę
              </Button>
            ) : (
              changeLink
            )}
          </div>
          {accepted && (
            <RouteSheet
              stops={route.stops}
              path={route.path}
              onPick={setSelectedId}
            />
          )}
        </div>
      </div>

      <aside
        aria-label="Trasa"
        className={cn(
          "min-w-0 border-t bg-grid p-4 lg:overflow-y-auto lg:border-t-0 lg:border-l lg:p-6",
          accepted
            ? "hidden lg:block lg:p-3"
            : "max-lg:flex max-lg:h-dvh max-lg:flex-col max-lg:overflow-hidden",
        )}
      >
        {!accepted && (
          <Button asChild variant="ghost" className="mb-3 self-start lg:hidden">
            <Link to={planHref(plan)}>
              <ArrowLeft /> Zmień dane
            </Link>
          </Button>
        )}
        <RoutePanel
          route={route}
          recalculating={editor.recalculating}
          error={editor.error}
          availableMinutes={availableMinutes}
          compact={accepted}
          onSelect={setSelectedId}
          onMove={editor.move}
          onRemove={editor.remove}
          onAdd={editor.add}
          onSetVisitMinutes={editor.setVisitMinutes}
          onSwap={editor.swap}
          onExtendTime={setAvailableMinutes}
          onAccept={accept}
        />
      </aside>
    </main>
  );
}
