import { Plus, X } from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { cn } from "@/lib/utils";
import { matchTags, type Tag } from "@/api/tags";
import { useTags } from "@/hooks/useTags";

const POPULAR = [
  "art_nouveau",
  "art_deco",
  "modernism",
  "gothic",
  "baroque",
  "museum",
  "park",
  "street_art",
  "unesco",
  "free_entry",
];

const MIN_TEXT_LENGTH = 2;

type Props = {
  value: string[];
  onChange: (ids: string[]) => void;
};

export function TagPicker({ value, onChange }: Props) {
  const inputId = useId();
  const { tags, state } = useTags();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const label = (id: string) => tags.find((t) => t.id === id)?.label ?? id;
  const free = (list: Tag[]) => list.filter((t) => !value.includes(t.id));
  const popular = free(
    POPULAR.flatMap((id) => tags.find((t) => t.id === id) ?? []),
  );

  function add(list: Tag[]) {
    const fresh = free(list);
    if (fresh.length) onChange([...value, ...fresh.map((t) => t.id)]);
  }

  async function addDraft() {
    const text = draft.trim();
    if (text.length < MIN_TEXT_LENGTH || busy) return;
    const exact = tags.find(
      (t) => t.label.toLowerCase() === text.toLowerCase(),
    );
    if (exact) {
      add([exact]);
      setDraft("");
      setNote("");
      return;
    }
    setBusy(true);
    setNote("");
    try {
      const matched = await matchTags(text);
      if (matched.length === 0) {
        setNote(`Nie znaleźliśmy motywu pasującego do „${text}”.`);
      } else {
        add(matched);
        setNote(`„${text}” → ${matched.map((t) => t.label).join(", ")}`);
        setDraft("");
      }
    } catch {
      setNote("Nie udało się dopasować motywu. Spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2 short:gap-1.5">
      <Label htmlFor={inputId}>Co Cię interesuje?</Label>
      {value.length > 0 && (
        <ul aria-label="Wybrane motywy" className="flex flex-wrap gap-2">
          {value.map((id) => (
            <li key={id}>
              <Badge
                variant="secondary"
                className="h-8 gap-1 pr-1 pl-2.5 text-sm"
              >
                {label(id)}
                <button
                  type="button"
                  aria-label={`Usuń motyw ${label(id)}`}
                  onClick={() => onChange(value.filter((x) => x !== id))}
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
          id={inputId}
          placeholder="np. gotyckie kościoły, street art…"
          value={draft}
          maxLength={60}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              void addDraft();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label="Dodaj motyw"
          disabled={busy || draft.trim().length < MIN_TEXT_LENGTH}
          onClick={() => void addDraft()}
        >
          <Plus />
        </Button>
      </div>
      <p
        role="status"
        className={cn(
          "text-xs text-muted-foreground",
          !busy && state !== "error" && !note && "short:hidden",
        )}
      >
        {busy
          ? "Dopasowujemy do naszych motywów… (pierwsze użycie może potrwać)"
          : state === "error"
            ? "Nie udało się pobrać listy motywów."
            : note ||
              "Wpisz dowolny motyw, dopasujemy go do naszych kategorii."}
      </p>
      {popular.length > 0 && (
        <div
          role="group"
          aria-label="Podpowiedzi motywów"
          className="flex flex-wrap gap-1.5 short:[&>button:nth-child(n+8)]:hidden"
        >
          {popular.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => add([tag])}
              className="h-8 rounded-md border border-dashed px-2.5 text-xs text-muted-foreground outline-none hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring short:h-7"
            >
              + {tag.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
