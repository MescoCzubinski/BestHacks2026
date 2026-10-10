import { LocateFixed, MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";
import { reverseLocation } from "../api/reverseLocation";
import type { Location } from "../api/searchLocations";
import {
  useLocationSuggestions,
  type SuggestionState,
} from "../model/useLocationSuggestions";

export type Point = { label: string; lat?: number; lng?: number };

type Status =
  | "idle"
  | "locating"
  | "detected"
  | "denied"
  | "outside"
  | "unresolved"
  | "chosen"
  | "typed";

const MESSAGES: Record<Status, string> = {
  idle: "Wpisz adres albo użyj swojej lokalizacji.",
  locating: "Ustalamy Twoją lokalizację…",
  detected: "Używamy Twojej aktualnej lokalizacji.",
  denied: "Nie udało się ustalić lokalizacji. Wpisz adres.",
  outside: "Aplikacja nie działa w tej miejscowości. Wpisz adres.",
  unresolved: "Nie udało się ustalić adresu. Wpisz adres.",
  chosen: "Punkt startu wybrany z listy.",
  typed: "Wybierz adres z listy podpowiedzi.",
};

function suggestionMessage(
  status: Status,
  state: SuggestionState,
  count: number,
): string | undefined {
  if (status !== "typed") return undefined;
  if (state === "loading") return "Szukamy adresów…";
  if (state === "error")
    return "Nie udało się wyszukać adresu. Spróbuj ponownie.";
  if (state === "ready" && count === 0)
    return "Nie znaleźliśmy takiego adresu w obsługiwanych miastach.";
  return undefined;
}

function outsideMessage(city: string, supportedCities: string[]): string {
  const where = city
    ? `Aplikacja nie działa w miejscowości ${city}.`
    : MESSAGES.outside;
  return `${where} Obsługiwane miasta: ${supportedCities.join(", ")}.`;
}

type Props = {
  label: string;
  value: Point;
  onChange: (value: Point) => void;
  detectPosition?: boolean;
};

export function LocationField({
  label,
  value,
  onChange,
  detectPosition = false,
}: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const [status, setStatus] = useState<Status>("idle");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [outside, setOutside] = useState<{
    city: string;
    supportedCities: string[];
  } | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const { locations: options, state } = useLocationSuggestions(
    value.label,
    status === "typed",
  );
  const expanded = open && options.length > 0;
  const message =
    suggestionMessage(status, state, options.length) ??
    (status === "outside" && outside
      ? outsideMessage(outside.city, outside.supportedCities)
      : status === "idle" && !detectPosition
        ? "Wpisz adres i wybierz go z listy."
        : MESSAGES[status]);

  function locate() {
    if (!navigator.geolocation) {
      setStatus("denied");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const result = await reverseLocation(latitude, longitude);
          if (result.supported) {
            onChangeRef.current({
              label: result.location.label,
              lat: latitude,
              lng: longitude,
            });
            setStatus("detected");
          } else {
            setOutside({
              city: result.location.city,
              supportedCities: result.supportedCities,
            });
            setStatus("outside");
          }
        } catch {
          setStatus("unresolved");
        }
      },
      () => setStatus("denied"),
      { timeout: 8000 },
    );
  }

  useEffect(() => {
    if (detectPosition) locate();
  }, []);

  function choose(location: Location) {
    onChange({ label: location.label, lat: location.lat, lng: location.lng });
    setStatus("chosen");
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (options.length === 0) return;
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((active + step + options.length) % options.length);
    } else if (e.key === "Enter" && expanded) {
      e.preventDefault();
      const location = options[active] ?? options[0];
      if (location) choose(location);
    } else if (e.key === "Escape" && expanded) {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" />
          <Input
            id={id}
            role="combobox"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              expanded && active >= 0 ? `${id}-opt-${active}` : undefined
            }
            autoComplete="off"
            placeholder="Miasto, ulica i numer"
            maxLength={100}
            className="pl-9"
            value={value.label}
            onChange={(e) => {
              onChange({ label: e.target.value });
              setStatus("typed");
              setOpen(true);
              setActive(-1);
            }}
            onKeyDown={onKeyDown}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
          />
          {expanded && (
            <ul
              id={listId}
              role="listbox"
              aria-label="Podpowiedzi adresów"
              className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-float"
            >
              {options.map((location, i) => (
                <li
                  key={location.label}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(location);
                  }}
                  onMouseMove={() => setActive(i)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center rounded-sm px-2 py-1 text-sm",
                    i === active && "bg-secondary",
                  )}
                >
                  {location.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        {detectPosition && (
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="Użyj mojej lokalizacji"
            onClick={locate}
            disabled={status === "locating"}
          >
            <LocateFixed />
          </Button>
        )}
      </div>
      <p role="status" className="text-xs text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
