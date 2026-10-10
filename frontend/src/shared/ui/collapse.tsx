import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

const ANIMATION_MS = 300;

function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  const [settled, setSettled] = useState(open);

  useEffect(() => {
    if (!open) {
      setSettled(false);
      return;
    }
    const timer = setTimeout(() => setSettled(true), ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <div
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div
        className={cn(
          "min-h-0",
          settled ? "overflow-visible" : "overflow-hidden",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export { Collapse };
