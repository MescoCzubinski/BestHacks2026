import { LocateFixed, MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";
import { matchCities } from "../lib/matchCities";
import type { City } from "../model/cities";

export type StartPoint = { label: string; lat?: number; lng?: number };

type Status = "idle" | "locating" | "detected" | "denied" | "chosen" | "typed";

const MESSAGES: Record<Status, string> = {
  idle: "Wpisz miasto albo użyj swojej lokalizacji.",
  locating: "Ustalamy Twoją lokalizację…",
  detected: "Używamy Twojej aktualnej lokalizacji.",
  denied: "Nie udało się ustalić lokalizacji. Wybierz miasto z listy.",
  chosen: "Punkt startu wybrany z listy.",
  typed: "Wybierz miasto z listy podpowiedzi.",
};

type Props = {
  value: StartPoint;
  onChange: (value: StartPoint) => void;
};

export function StartPointField({ value, onChange }: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const [status, setStatus] = useState<Status>("idle");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const options = status === "typed" ? matchCities(value.label) : [];
  const expanded = open && options.length > 0;

  function locate() {
    if (!navigator.geolocation) {
      setStatus("denied");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onChangeRef.current({
          label: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          lat: latitude,
          lng: longitude,
        });
        setStatus("detected");
      },
      () => setStatus("denied"),
      { timeout: 8000 },
    );
  }

  useEffect(locate, []);

  function choose(city: City) {
    onChange({ label: city.name, lat: city.lat, lng: city.lng });
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
      const city = options[active] ?? options[0];
      if (city) choose(city);
    } else if (e.key === "Escape" && expanded) {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Punkt startu</Label>
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
              aria-label="Podpowiedzi miast"
              className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-float"
            >
              {options.map((city, i) => (
                <li
                  key={city.name}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(city);
                  }}
                  onMouseMove={() => setActive(i)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-sm px-2 text-sm",
                    i === active && "bg-secondary",
                  )}
                >
                  <span className="font-medium">{city.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {city.region}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
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
      </div>
      <p role="status" className="text-xs text-muted-foreground">
        {MESSAGES[status]}
      </p>
    </div>
  );
}
