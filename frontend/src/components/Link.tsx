import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { navigate } from "@/lib/navigation";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

export function Link({ to, onClick, ...props }: Props) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    const modified = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
    if (e.defaultPrevented || modified || e.button !== 0) return;
    e.preventDefault();
    navigate(to);
  }
  return <a href={to} onClick={handleClick} {...props} />;
}
