import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { formatMinutes, type RouteStop } from "@/entities/route";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { usePlaceSearch } from "../model/usePlaceSearch";

type Props = {
  onAdd: (stop: RouteStop) => void;
  existingIds: string[];
};

export function PlaceSearch({ onAdd, existingIds }: Props) {
  const id = useId();
  const [query, setQuery] = useState("");
  const { places, state } = usePlaceSearch(query);
  const options = places.filter((p) => !existingIds.includes(p.id));

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Dodaj miejsce</Label>
      <Input
        id={id}
        type="search"
        placeholder="Szukaj miejsca w bazie…"
        autoComplete="off"
        maxLength={100}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <p role="status" className="text-xs text-muted-foreground">
        {state === "loading"
          ? "Szukamy…"
          : state === "error"
            ? "Nie udało się wyszukać miejsc."
            : state === "ready" && options.length === 0
              ? "Nie znaleźliśmy takiego miejsca w naszej bazie."
              : ""}
      </p>
      {options.length > 0 && (
        <ul aria-label="Wyniki wyszukiwania" className="grid gap-1">
          {options.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                onClick={() => {
                  onAdd(place);
                  setQuery("");
                }}
                className="flex min-h-11 w-full items-center gap-2 rounded-md border bg-card px-2 text-left text-sm outline-none hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring"
              >
                <Plus className="size-4 shrink-0" />
                <span className="grid min-w-0 flex-1 leading-snug">
                  <span className="truncate font-medium">{place.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatMinutes(place.visitMinutes)}
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
