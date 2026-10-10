import { useEffect, useState } from "react";

const QUERY = "(min-width: 1024px)";

/** True from the `lg` breakpoint up; below it the app shows one screen at a time with popups. */
export function useIsDesktop() {
  const [desktop, setDesktop] = useState(
    () => window.matchMedia(QUERY).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const update = () => setDesktop(mql.matches);
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return desktop;
}
