import * as React from "react";
import { cn } from "@/shared/lib/utils";

/** Horizontal rule, optionally with a centered label ("lub", "Użytkownicy demo"). */
function Separator({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  if (!children) {
    return (
      <div
        role="separator"
        className={cn("h-px w-full bg-border", className)}
        {...props}
      />
    );
  }
  return (
    <div className={cn("flex items-center gap-3", className)} {...props}>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <span className="text-xs tracking-wider text-muted-foreground uppercase">
        {children}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  );
}

export { Separator };
