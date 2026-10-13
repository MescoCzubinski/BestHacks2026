import { Link } from "@/components/Link";
import { Logo } from "@/components/Logo";
import { TagPicker } from "./TagPicker";
import { LocationField } from "./LocationField";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { Collapse } from "@/ui/collapse";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { formProblem, type PlanFormState } from "./planForm";

type Props = {
  value: PlanFormState;
  onChange: (value: PlanFormState) => void;
  onSubmit: () => void;
};

export function PlanForm({ value, onChange, onSubmit }: Props) {
  const problem = formProblem(value);
  const patch = (changes: Partial<PlanFormState>) =>
    onChange({ ...value, ...changes });

  return (
    <div className="flex flex-col gap-4 p-4 lg:gap-10 lg:px-18 lg:py-10 short:gap-2 short:py-2">
      <div className="flex items-center justify-between gap-2 pl-2 lg:pl-0">
        <Logo className="short:[&>span]:text-[28px] short:[&>svg]:size-9" />
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <span className="sm:hidden">Historia</span>
              <span className="max-sm:hidden">Poprzednie trasy</span>
            </Link>
          </Button>
        </div>
      </div>
      <div className="mx-auto my-auto grid w-full max-w-110 gap-4 lg:gap-6 short:gap-2">
        <div className="grid gap-1">
          <h1 className="font-heading text-3xl font-extrabold short:text-2xl">
            Zaplanuj podróż
          </h1>
          <p className="text-sm text-muted-foreground max-lg:hidden">
            Ułożymy pieszą trasę dopasowaną do Twoich zainteresowań i czasu.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!problem) onSubmit();
          }}
          className="grid gap-3 lg:gap-5 short:gap-2"
        >
          <LocationField
            label="Punkt startu"
            value={value.start}
            onChange={(start) => patch({ start })}
            detectPosition
          />

          <div className="grid">
            <div className="flex items-center gap-2 pb-3 short:pb-1">
              <Checkbox
                id="same-end"
                checked={value.sameEnd}
                onChange={(e) => patch({ sameEnd: e.target.checked })}
              />
              <Label htmlFor="same-end">Zakończ w miejscu startu</Label>
            </div>
            <Collapse open={!value.sameEnd}>
              <div className="pb-1">
                <LocationField
                  label="Punkt końcowy"
                  value={value.end}
                  onChange={(end) => patch({ end })}
                />
              </div>
            </Collapse>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hours">Ile masz czasu? (godz.)</Label>
            <Input
              id="hours"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="np. 1,5 lub 1:30"
              value={value.hours}
              onChange={(e) => patch({ hours: e.target.value })}
            />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="wheelchair"
              className="mt-0.5"
              checked={value.wheelchair}
              onChange={(e) => patch({ wheelchair: e.target.checked })}
            />
            <Label htmlFor="wheelchair" className="grid gap-0.5 leading-snug">
              Trasa dostępna dla osób na wózku
              <span className="text-xs font-normal text-muted-foreground max-lg:hidden">
                Wybierzemy miejsca bez barier.
              </span>
            </Label>
          </div>

          <TagPicker value={value.tags} onChange={(tags) => patch({ tags })} />

          <div className="grid gap-2">
            <Button
              type="submit"
              variant="brand"
              size="xl"
              className="w-full"
              disabled={Boolean(problem)}
            >
              Wygeneruj trasę
            </Button>
            <p role="status" className="min-h-4 text-xs text-muted-foreground">
              {problem ?? ""}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
