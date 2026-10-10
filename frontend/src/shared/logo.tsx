import { cn } from "@/shared/lib/utils";

export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-primary font-heading font-extrabold text-accent",
          size === "md" ? "size-9 text-xl" : "size-8 text-lg",
        )}
      >
        A
      </div>
      <span
        className={cn(
          "font-heading font-extrabold",
          size === "md" ? "text-[22px]" : "text-xl",
        )}
      >
        Atlas
      </span>
    </div>
  );
}
