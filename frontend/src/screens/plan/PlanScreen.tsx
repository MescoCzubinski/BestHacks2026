import { useEffect, useState } from "react";
import { warmUp } from "@/api/warmUp";
import { GridPanel } from "@/components/GridPanel";
import { useLocation } from "@/hooks/useLocation";
import { navigate } from "@/lib/navigation";
import { parseRoutePlan, routeHref } from "@/lib/routePlan";
import { PlanForm } from "./PlanForm";
import { formFromPlan, toRoutePlan, type PlanFormState } from "./planForm";

const INITIAL_FORM: PlanFormState = {
  start: { label: "" },
  sameEnd: true,
  end: { label: "" },
  hours: "3",
  wheelchair: false,
  tags: [],
};

export function PlanScreen() {
  const { search } = useLocation();
  const [form, setForm] = useState(() => {
    const plan = parseRoutePlan(search);
    return plan ? formFromPlan(plan) : INITIAL_FORM;
  });

  useEffect(() => {
    void warmUp();
  }, []);

  function submit() {
    const plan = toRoutePlan(form);
    if (plan) navigate(routeHref(plan));
  }

  return (
    <main
      id="main"
      tabIndex={-1}
      className="grid bg-background outline-none max-lg:min-h-dvh lg:h-screen lg:grid-cols-[3fr_2fr]"
    >
      <div className="min-w-0 lg:overflow-y-auto">
        <PlanForm value={form} onChange={setForm} onSubmit={submit} />
      </div>
      <GridPanel className="hidden lg:flex" />
    </main>
  );
}
