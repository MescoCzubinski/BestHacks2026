import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { RouteRequestError } from "@/entities/route";
import { createRoute } from "@/features/build-route";
import { useEditableRoute } from "@/features/edit-route";
import { useTags } from "@/features/pick-interests";
import { saveRoute } from "@/features/saved-routes";
import { RouteMap } from "@/features/route-map";
import { Button } from "@/shared/ui/button";
import { Modal } from "@/shared/ui/modal";
import { cn } from "@/shared/lib/utils";
import {
  formatHours,
  hoursToMinutes,
  toRouteRequest,
  type PlanFormState,
} from "../lib/planForm";
import { HistoryPanel } from "./HistoryPanel";
import { RouteSheet } from "./RouteSheet";
import { PlanForm } from "./PlanForm";
import { RoutePanel } from "./RoutePanel";

type Phase = "input" | "proposal" | "accepted";

const COLUMNS: Record<Phase, string> = {
  input: "3fr 2fr",
  proposal: "3fr 2fr",
  accepted: "4fr 1fr",
};

const INITIAL_FORM: PlanFormState = {
  start: { label: "" },
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
  const [historyPopup, setHistoryPopup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const editor = useEditableRoute();
  const { tags } = useTags();
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
        extras: built.extras,
        path: built.path,
      });
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

  function accept() {
    if (route) {
      saveRoute({
        title: form.tags
          .map((id) => tags.find((t) => t.id === id)?.label ?? id)
          .join(", "),
        tags: form.tags,
        durationMinutes: hoursToMinutes(form.hours),
        start: route.start,
        end: route.end,
        stops: route.stops,
      });
    }
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    setSelectedId(desktop ? route?.stops[0]?.id : undefined);
    setPhase("accepted");
  }

  const accepted = phase === "accepted" && route;
  const showRoute = phase !== "input" && route && !showHistory;

  return (
    <main
      id="main"
      tabIndex={-1}
      style={{ "--cols": COLUMNS[phase] } as React.CSSProperties}
      className="grid bg-background transition-[grid-template-columns] duration-500 ease-in-out outline-none motion-reduce:transition-none max-lg:h-dvh max-lg:overflow-hidden lg:h-screen lg:grid-cols-[var(--cols)]"
    >
      <div
        className={cn(
          "min-w-0 max-lg:min-h-0 max-lg:overflow-y-auto lg:overflow-y-auto",
          phase === "proposal" && "hidden lg:block",
        )}
      >
        {accepted ? (
          <div className="relative h-dvh lg:h-full">
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
              className="absolute top-3 left-3 z-[500] h-10 bg-background shadow-float"
              onClick={() => setPhase("proposal")}
            >
              <ArrowLeft /> Zmień dane trasy
            </Button>
            <RouteSheet
              stops={route.stops}
              path={route.path}
              onPick={setSelectedId}
            />
          </div>
        ) : (
          <PlanForm
            value={form}
            onChange={setForm}
            onSubmit={() => void generate()}
            submitting={submitting}
            error={error}
            submitLabel={route ? "Wygeneruj ponownie" : "Wygeneruj trasę"}
            onShowHistory={() => setHistoryPopup(true)}
          />
        )}
      </div>

      <aside
        aria-label="Trasa i poprzednie trasy"
        className={cn(
          "min-w-0 border-t bg-grid p-4 lg:overflow-y-auto lg:border-t-0 lg:border-l lg:p-6",
          phase === "accepted" && "lg:p-3",
          phase === "proposal"
            ? "max-lg:flex max-lg:h-dvh max-lg:flex-col max-lg:overflow-hidden"
            : "hidden lg:block",
        )}
      >
        {showRoute && (
          <Button
            type="button"
            variant="ghost"
            className="mb-3 lg:hidden"
            onClick={() => setPhase("input")}
          >
            <ArrowLeft /> Zmień dane
          </Button>
        )}
        {showRoute ? (
          <RoutePanel
            route={route}
            recalculating={editor.recalculating}
            error={editor.error}
            availableMinutes={hoursToMinutes(form.hours)}
            compact={phase === "accepted"}
            onSelect={setSelectedId}
            onMove={editor.move}
            onRemove={editor.remove}
            onAdd={editor.add}
            onSetVisitMinutes={editor.setVisitMinutes}
            onSwap={editor.swap}
            onExtendTime={(minutes) =>
              setForm((f) => ({ ...f, hours: formatHours(minutes) }))
            }
            onAccept={accept}
            onShowHistory={() => setShowHistory(true)}
          />
        ) : (
          <HistoryPanel
            onBack={
              phase !== "input" && route
                ? () => setShowHistory(false)
                : undefined
            }
          />
        )}
      </aside>

      {historyPopup && phase === "input" && (
        <Modal
          label="Twoje poprzednie trasy"
          onClose={() => setHistoryPopup(false)}
          className="max-w-md"
        >
          <div className="p-4">
            <HistoryPanel />
          </div>
        </Modal>
      )}
    </main>
  );
}
