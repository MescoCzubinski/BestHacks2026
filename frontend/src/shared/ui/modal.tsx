import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

const EXIT_MS = 250;

/**
 * Popup on the native <dialog>: traps focus, closes on Escape and returns focus to the trigger.
 * It animates in and out; `onClose` runs after the exit animation.
 */
function Modal({
  label,
  onClose,
  children,
  className,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(onClose, EXIT_MS);
    return () => clearTimeout(timer);
  }, [closing, onClose]);

  const close = () => setClosing(true);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      data-closing={closing || undefined}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => e.target === ref.current && close()}
      className={cn(
        "modal max-h-[85dvh] overflow-y-auto border bg-card p-0 text-card-foreground shadow-float backdrop:bg-foreground/40",
        "m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Zamknij"
        className="absolute top-2 right-2 z-10"
        onClick={close}
      >
        <X />
      </Button>
      {children}
    </dialog>
  );
}

export { Modal };
