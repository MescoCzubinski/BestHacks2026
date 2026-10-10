import * as React from "react";
import { cn } from "@/shared/lib/utils";

/** Initials-only avatar (shadcn Avatar fallback). */
function Avatar({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-tint text-sm font-medium",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar };
