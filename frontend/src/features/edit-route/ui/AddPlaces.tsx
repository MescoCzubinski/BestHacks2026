import { Plus } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { formatMinutes, type RouteStop } from "@/entities/route";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";
import { Label } from "@/shared/ui/label";
import {
  additionCost,
  roundUpToQuarter,
  suggestRemovals,
} from "../lib/planAddition";
import { usePlaceSearch } from "../model/usePlaceSearch";
import type { EditableRoute } from "../model/useEditableRoute";

const SHOWN_WITHOUT_QUERY = 5;

type Props = {
  route: EditableRoute;
  availableMinutes: number;
  totalMinutes: number;
  onAdd: (stop: RouteStop, index?: number) => void;
  onSwap: (removeIds: string[], stop?: RouteStop, index?: number) => void;
  onExtendTime: (minutes: number) => void;
};

type Candidate = { stop: RouteStop; index: number; cost: number };

export function AddPlaces({
  route,
  availableMinutes,
  totalMinutes,
  onAdd,
  onSwap,
  onExtendTime,
}: Props) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<Candidate | null>(null);
  const { places: found, state } = usePlaceSearch(query);

  const slack = availableMinutes - totalMinutes;
  const q = query.trim().toLowerCase();

  const candidates = useMemo(() => {
    const inRoute = (s: RouteStop) => route.stops.some((r) => r.id === s.id);
    const pool = new Map<string, RouteStop>();
    for (const stop of route.extras) pool.set(stop.id, stop);
    for (const stop of found) pool.set(stop.id, stop);
    return [...pool.values()]
      .filter((s) => !inRoute(s))
      .filter(
        (s) => !q || s.name.toLowerCase().includes(q) || found.includes(s),
      )
      .map((stop) => ({ stop, ...additionCost(route, stop) }))
      .map(({ stop, index, minutes }) => ({ stop, index, cost: minutes }))
      .sort((a, b) => a.cost - b.cost);
  }, [route, found, q]);

  const shown = q ? candidates : candidates.slice(0, SHOWN_WITHOUT_QUERY);
  const nearestOver = candidates.find((c) => c.cost > slack);

  function choose(c: Candidate) {
    if (c.cost <= slack) {
      onAdd(c.stop, c.index);
      setQuery("");
      setPending(null);
    } else {
      setPending(c);
    }
  }

  function extendFor(c: Candidate) {
    onExtendTime(roundUpToQuarter(totalMinutes + c.cost));
    onAdd(c.stop, c.index);
    setQuery("");
    setPending(null);
  }

  const overBy = pending ? pending.cost - slack : 0;
  const removals = pending ? suggestRemovals(route, overBy) : [];
  const nameOf = (rid: string) =>
    route.stops.find((s) => s.id === rid)?.name ?? rid;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Dodaj miejsce</Label>
      <Input
        id={id}
        type="search"
        placeholder="Szukaj miejsca…"
        autoComplete="off"
        maxLength={100}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPending(null);
        }}
      />

      {pending && (
        <div
          role="group"
          aria-label="Propozycja zmiany trasy"
          className="grid gap-2 rounded-xl border border-primary bg-card p-3 text-sm shadow-card"
        >
          <p className="leading-snug">
            <b>{pending.stop.name}</b> (+{formatMinutes(pending.cost)}) nie
            mieści się w Twoim czasie o {formatMinutes(overBy)}. Co zrobić?
          </p>
          {removals.map((r) => (
            <Button
              key={r.ids.join("|")}
              type="button"
              variant="outline"
              className="h-auto justify-start py-2 text-left whitespace-normal"
              onClick={() => {
                onSwap(r.ids, pending.stop, pending.index);
                setQuery("");
                setPending(null);
              }}
            >
              Usuń {r.ids.map(nameOf).join(", ")} (−
              {formatMinutes(r.savedMinutes)}) i dodaj
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            className="h-auto justify-start py-2 text-left whitespace-normal"
            onClick={() => extendFor(pending)}
          >
            Wydłuż czas do{" "}
            {formatMinutes(roundUpToQuarter(totalMinutes + pending.cost))} i
            dodaj
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPending(null)}
          >
            Anuluj
          </Button>
        </div>
      )}

      {!q && !pending && nearestOver && (
        <p className="text-xs text-muted-foreground">
          Jeśli wydłużymy trasę o{" "}
          {formatMinutes(Math.max(nearestOver.cost - slack, 0))}, zobaczysz
          jeszcze: <b>{nearestOver.stop.name}</b>.{" "}
          <button
            type="button"
            onClick={() => choose(nearestOver)}
            className="underline underline-offset-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            Zobacz opcje
          </button>
        </p>
      )}

      <p role="status" className="text-xs text-muted-foreground">
        {state === "loading"
          ? "Szukamy…"
          : state === "error" && shown.length === 0
            ? "Nie udało się wyszukać miejsc."
            : q && state === "ready" && shown.length === 0
              ? "Nie znaleźliśmy takiego miejsca w naszej bazie."
              : ""}
      </p>

      {shown.length > 0 && (
        <ul
          aria-label={q ? "Wyniki wyszukiwania" : "Dodatkowe miejsca"}
          className={cn("grid gap-1", !q && "max-lg:hidden")}
        >
          {shown.map((c) => (
            <li key={c.stop.id}>
              <button
                type="button"
                onClick={() => choose(c)}
                className="flex min-h-11 w-full items-center gap-2 rounded-md border bg-card px-2 text-left text-sm outline-none hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring"
              >
                <Plus className="size-4 shrink-0" />
                <span className="grid min-w-0 flex-1 leading-snug">
                  <span className="truncate font-medium">{c.stop.name}</span>
                  <span className="text-xs text-muted-foreground">
                    +{formatMinutes(c.cost)}
                    {c.cost > slack &&
                      ` · wymaga wydłużenia o ${formatMinutes(c.cost - slack)}`}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
