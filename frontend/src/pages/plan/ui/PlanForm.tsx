import { Logo } from "@/shared/logo";
import { InterestTags } from "@/features/pick-interests";
import { LocationField } from "@/features/pick-location";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Collapse } from "@/shared/ui/collapse";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";
import {
  formProblem,
  MAX_HOURS,
  MIN_HOURS,
  type PlanFormState,
} from "../lib/planForm";

type Props = {
  value: PlanFormState;
  onChange: (value: PlanFormState) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string;
  submitLabel: string;
  onShowHistory: () => void;
};

export function PlanForm({
  value,
  onChange,
  onSubmit,
  submitting,
  error,
  submitLabel,
  onShowHistory,
}: Props) {
  const problem = formProblem(value);
  const patch = (changes: Partial<PlanFormState>) =>
    onChange({ ...value, ...changes });

  return (
    <div className="flex flex-col gap-4 p-4 lg:gap-10 lg:px-18 lg:py-10">
      <div className="flex items-center justify-between gap-2 pl-2 lg:pl-0">
        <Logo />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="lg:hidden"
          onClick={onShowHistory}
        >
          Poprzednie trasy
        </Button>
      </div>
      <div className="mx-auto my-auto grid w-full max-w-110 gap-4 lg:gap-6">
        <div className="grid gap-1">
          <h1 className="font-heading text-3xl font-extrabold">
            Zaplanuj podróż
          </h1>
          <p className="text-sm text-muted-foreground max-lg:hidden">
            Ułożymy pieszą trasę dopasowaną do Twoich zainteresowań i czasu.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!problem && !submitting) onSubmit();
          }}
          className="grid gap-3 lg:gap-5"
        >
          <LocationField
            label="Punkt startu"
            value={value.start}
            onChange={(start) => patch({ start })}
            detectPosition
          />

          <div className="grid">
            <div className="flex items-center gap-2 pb-3">
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
              type="number"
              inputMode="decimal"
              min={MIN_HOURS}
              max={MAX_HOURS}
              step={0.25}
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

          <InterestTags
            value={value.tags}
            onChange={(tags) => patch({ tags })}
          />

          <div className="grid gap-2">
            <Button
              type="submit"
              variant="brand"
              size="xl"
              className="w-full"
              disabled={Boolean(problem) || submitting}
            >
              {submitting ? "Układamy trasę…" : submitLabel}
            </Button>
            <p
              role="status"
              className={cn(
                "min-h-4 text-xs",
                error ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {error || problem || ""}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
