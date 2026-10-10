import {
  CalendarDays,
  Clock,
  History,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { CITY, PLACES, type Place } from "@/data/places";
import { SAVED_ROUTES, type SavedRoute } from "@/data/routes";
import { StartPointField, type StartPoint } from "@/features/pick-location";
import { Logo } from "@/shared/logo";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { pl } from "react-day-picker/locale";
import { Card } from "@/shared/ui/card";
import { Calendar } from "@/shared/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { href } from "@/shared/lib/route";

const SUGGESTED_TAGS = [
  "Secesja",
  "Art Deco",
  "Modernizm",
  "Legendy Wrocławia",
  "Dziedzictwo przemysłowe",
];

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => toIso(new Date());
const now = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const dateFmt = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const formatDate = (iso: string) => dateFmt.format(new Date(`${iso}T12:00:00`));
const formatDuration = (min: number) =>
  min % 60 === 0
    ? `${min / 60} godz.`
    : `${Math.floor(min / 60)} godz. ${min % 60} min`;

export default function Plan() {
  const [start, setStart] = useState<StartPoint>({
    label: CITY.name,
    lat: CITY.lat,
    lng: CITY.lng,
  });
  const [tags, setTags] = useState<string[]>(["Art Deco"]);
  const [tagDraft, setTagDraft] = useState("");
  const [date, setDate] = useState(today);
  const [dateOpen, setDateOpen] = useState(false);
  const [time, setTime] = useState(now);
  const [hours, setHours] = useState("3");
  const [stops, setStops] = useState<Place[]>(PLACES);

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag || tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    setTags([...tags, tag]);
  }

  function submitTag() {
    addTag(tagDraft);
    setTagDraft("");
  }

  function reuse(route: SavedRoute) {
    setTags(route.tags);
    setHours(String(route.durationMin / 60));
    setStops(
      route.placeIds
        .map((id) => PLACES.find((p) => p.id === id))
        .filter((p): p is Place => !!p),
    );
  }

  const freeSuggestions = SUGGESTED_TAGS.filter(
    (s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main
        id="main"
        tabIndex={-1}
        className="grid flex-1 outline-none lg:grid-cols-5"
      >
        <div className="grid content-start gap-6 p-4 lg:col-span-3 lg:p-6">
          <div className="pl-2 lg:pl-0">
            <Logo />
          </div>
          <div className="grid gap-1">
            <h1 className="font-heading text-3xl font-extrabold">
              Zaplanuj podróż
            </h1>
            <p className="text-sm text-muted-foreground">
              Wybierz punkt startu, motyw i czas. Ułożymy trasę dopasowaną do
              Twoich zainteresowań.
            </p>
          </div>

          <div className="grid items-start gap-6 md:grid-cols-2">
            <form
              onSubmit={(e) => e.preventDefault()}
              className="grid gap-5 rounded-2xl border bg-card p-4 shadow-card"
            >
              <StartPointField value={start} onChange={setStart} />

              <div className="grid gap-2">
                <Label htmlFor="tag-input">Motyw podróży</Label>
                {tags.length > 0 && (
                  <ul
                    aria-label="Wybrane motywy"
                    className="flex flex-wrap gap-2"
                  >
                    {tags.map((t) => (
                      <li key={t}>
                        <Badge
                          variant="secondary"
                          className="h-8 gap-1 pr-1 pl-2.5 text-sm"
                        >
                          {t}
                          <button
                            type="button"
                            aria-label={`Usuń motyw ${t}`}
                            onClick={() => setTags(tags.filter((x) => x !== t))}
                            className="flex size-6 items-center justify-center rounded-sm outline-none hover:bg-background focus-visible:ring-[3px] focus-visible:ring-ring"
                          >
                            <X className="size-3.5" />
                          </button>
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  <Input
                    id="tag-input"
                    placeholder="np. secesja, legendy…"
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "," || e.key === "Enter") {
                        e.preventDefault();
                        submitTag();
                      }
                    }}
                    maxLength={40}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    disabled={!tagDraft.trim()}
                    onClick={submitTag}
                  >
                    Dodaj
                  </Button>
                </div>
                {freeSuggestions.length > 0 && (
                  <div
                    role="group"
                    aria-label="Podpowiedzi motywów"
                    className="flex flex-wrap gap-1.5"
                  >
                    {freeSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addTag(s)}
                        className="h-8 rounded-md border border-dashed px-2.5 text-xs text-muted-foreground outline-none hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 grid gap-2">
                  <Label htmlFor="date">
                    <CalendarDays className="mr-1.5 inline size-4" />
                    Dzień podróży
                  </Label>
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        type="button"
                        variant="outline"
                        className="h-11 justify-start px-3 text-base font-normal md:text-sm"
                      >
                        {formatDate(date)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        mode="single"
                        locale={pl}
                        weekStartsOn={1}
                        selected={new Date(`${date}T12:00:00`)}
                        defaultMonth={new Date(`${date}T12:00:00`)}
                        disabled={{ before: new Date(`${today()}T00:00:00`) }}
                        onSelect={(d) => {
                          if (!d) return;
                          setDate(toIso(d));
                          setDateOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="time">
                    <Clock className="mr-1.5 inline size-4" />
                    Godzina startu
                  </Label>
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hours">Czas (godz.)</Label>
                  <Input
                    id="hours"
                    type="number"
                    inputMode="decimal"
                    min={0.5}
                    max={12}
                    step={0.5}
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                  />
                </div>
              </div>

              {tags.length === 0 || stops.length === 0 ? (
                <Button variant="brand" size="xl" className="w-full" disabled>
                  Wygeneruj trasę
                </Button>
              ) : (
                <Button asChild variant="brand" size="xl" className="w-full">
                  <a href={href("app")}>Wygeneruj trasę</a>
                </Button>
              )}
            </form>

            <section aria-labelledby="stops-h" className="grid gap-3">
              <h2 id="stops-h" className="font-heading text-xl font-bold">
                Miejsca w podróży{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  ({stops.length})
                </span>
              </h2>
              {stops.length === 0 ? (
                <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                  Brak miejsc. Dodaj je z mapy przyciskiem „Dodaj do podróży”
                  albo wczytaj jedną z poprzednich tras.
                </p>
              ) : (
                <ol aria-label="Miejsca w podróży" className="grid gap-2">
                  {stops.map((p, i) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 rounded-xl border bg-card p-2 pr-1 shadow-card"
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand text-xs font-semibold text-brand-foreground"
                      >
                        {i + 1}
                      </span>
                      <span className="grid min-w-0 flex-1 leading-snug">
                        <span className="text-sm font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.tag}
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`Usuń ${p.name} z podróży`}
                        onClick={() =>
                          setStops(stops.filter((s) => s.id !== p.id))
                        }
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>

        <aside
          aria-labelledby="history-h"
          className="grid content-start gap-3 border-t bg-grid p-4 lg:col-span-2 lg:border-t-0 lg:border-l lg:p-6"
        >
          <h2
            id="history-h"
            className="mb-3 flex items-center gap-2 font-heading text-xl font-bold"
          >
            <History className="size-5" /> Twoje poprzednie trasy
          </h2>
          <ul className="grid gap-3">
            {SAVED_ROUTES.map((r) => (
              <li key={r.id}>
                <Card className="flex-row items-center gap-3 rounded-2xl p-4 shadow-card">
                  <div className="grid min-w-0 flex-1 gap-1.5">
                    <h3 className="font-heading text-lg leading-tight font-bold">
                      {r.title}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(r.date)} · {formatDuration(r.durationMin)} ·{" "}
                      {r.placeIds.length} przystanki
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {r.tags.map((t) => (
                        <Badge key={t} variant="outline">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 shrink-0"
                    onClick={() => reuse(r)}
                    aria-label={`Użyj ponownie trasy ${r.title}`}
                  >
                    <RotateCcw /> Wczytaj
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  );
}
