import { href } from "@/shared/lib/route";
import { cn } from "@/shared/lib/utils";

/** Plain single-colour map pin. */
function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        d="M16 1.5c-6.4 0-11.5 5-11.5 11.3 0 8 9.1 16.2 10.4 17.3a1.6 1.6 0 0 0 2.2 0c1.3-1.1 10.4-9.3 10.4-17.3C27.5 6.5 22.4 1.5 16 1.5Z"
        className="fill-primary"
      />
    </svg>
  );
}

export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <a
      href={href("landing")}
      aria-label="Atlas, strona główna"
      className={cn("flex items-center gap-2", className)}
    >
      <Mark className={size === "md" ? "size-9" : "size-8"} />
      <span
        className={cn(
          "font-heading font-extrabold",
          size === "md" ? "text-[26px]" : "text-2xl",
        )}
      >
        Atlas
      </span>
    </a>
  );
}
