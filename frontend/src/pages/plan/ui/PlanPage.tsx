import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { CITY } from "@/data/places";
import type { SavedRoute } from "@/data/routes";
import { RouteRequestError } from "@/entities/route";
import { createRoute } from "@/features/build-route";
import { useEditableRoute } from "@/features/edit-route";
import { RouteMap } from "@/features/route-map";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { toRouteRequest, type PlanFormState } from "../lib/planForm";
import { HistoryPanel } from "./HistoryPanel";
import { PlanForm } from "./PlanForm";
import { RoutePanel } from "./RoutePanel";

type Phase = "input" | "proposal" | "accepted";

const COLUMNS: Record<Phase, string> = {
  input: "3fr 2fr",
  proposal: "3fr 2fr",
  accepted: "4fr 1fr",
};

const INITIAL_FORM: PlanFormState = {
  start: { label: CITY.name, lat: CITY.lat, lng: CITY.lng },
  sameEnd: true,
  end: { label: "" },
  hours: "3",
  wheelchair: false,
  tags: [],
};

export default function PlanPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [phase, setPhase] = useState<Phase>("input");
  const [showHistory, setShowHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const editor = useEditableRoute();
  const route = editor.route;

  async function generate() {
    const request = toRouteRequest(form);
    if (!request) return;
    setSubmitting(true);
    setError("");
    try {
      const built = await createRoute(request);
      editor.load({
        start: request.start,
        end: request.end ?? request.start,
        stops: built.stops,
        path: built.path,
      });
      setSelectedId(built.stops[0]?.id);
      setShowHistory(false);
      setPhase("proposal");
    } catch (e) {
      setError(
        e instanceof RouteRequestError
          ? e.message
          : "Nie udało się ułożyć trasy.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function loadSaved(saved: SavedRoute) {
    setForm((f) => ({
      ...f,
      tags: saved.tags,
      hours: String(saved.durationMin / 60),
    }));
    editor.reset();
    setShowHistory(false);
    setPhase("input");
  }

  const accepted = phase === "accepted" && route;
  const showRoute = phase !== "input" && route && !showHistory;

  return (
    <main
      id="main"
      tabIndex={-1}
      style={{ "--cols": COLUMNS[phase] } as React.CSSProperties}
      className="grid bg-background transition-[grid-template-columns] duration-500 ease-in-out outline-none motion-reduce:transition-none lg:h-screen lg:grid-cols-[var(--cols)]"
    >
      <div className="min-w-0 lg:overflow-y-auto">
        {accepted ? (
          <div className="relative h-[60vh] lg:h-full">
            <RouteMap
              start={route.start}
              end={route.end}
              stops={route.stops}
              path={route.path}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <Button
              type="button"
              variant="outline"
              className="absolute top-3 left-14 z-[500] h-10 bg-background shadow-float"
              onClick={() => setPhase("proposal")}
            >
              <ArrowLeft /> Zmień dane trasy
            </Button>
          </div>
        ) : (
          <PlanForm
            value={form}
            onChange={setForm}
            onSubmit={() => void generate()}
            submitting={submitting}
            error={error}
            submitLabel={route ? "Wygeneruj ponownie" : "Wygeneruj trasę"}
          />
        )}
      </div>

      <aside
        aria-label="Trasa i poprzednie trasy"
        className={cn(
          "min-w-0 border-t bg-grid p-4 lg:overflow-y-auto lg:border-t-0 lg:border-l lg:p-6",
          phase === "accepted" && "lg:p-3",
        )}
      >
        {showRoute ? (
          <RoutePanel
            route={route}
            recalculating={editor.recalculating}
            error={editor.error}
            availableMinutes={Math.round(Number(form.hours) * 60)}
            compact={phase === "accepted"}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={editor.move}
            onRemove={editor.remove}
            onAdd={editor.add}
            onAccept={() => setPhase("accepted")}
            onShowHistory={() => setShowHistory(true)}
          />
        ) : (
          <HistoryPanel
            onLoad={loadSaved}
            onBack={
              phase !== "input" && route
                ? () => setShowHistory(false)
                : undefined
            }
          />
        )}
      </aside>
    </main>
  );
}
