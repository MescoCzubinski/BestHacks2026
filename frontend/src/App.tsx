import { useEffect, useRef, type ComponentType } from "react";
import { useLocation } from "@/hooks/useLocation";
import { PlanScreen } from "@/screens/plan/PlanScreen";
import { RouteScreen } from "@/screens/route/RouteScreen";
import { StartScreen } from "@/screens/start/StartScreen";

const SCREENS: Record<string, { screen: ComponentType; title: string }> = {
  "/": {
    screen: StartScreen,
    title: "Atlas | Trasy spacerowe po Twoich zainteresowaniach",
  },
  "/plan": { screen: PlanScreen, title: "Atlas | Zaplanuj podróż" },
  "/route": { screen: RouteScreen, title: "Atlas | Twoja trasa" },
};

function focusMain() {
  document.getElementById("main")?.focus({ preventScroll: true });
}

export default function App() {
  const { pathname } = useLocation();
  const { screen: Screen, title } = SCREENS[pathname] ?? SCREENS["/"]!;
  const previous = useRef(pathname);

  useEffect(() => {
    document.title = title;
    if (previous.current !== pathname) {
      window.scrollTo(0, 0);
      focusMain();
    }
    previous.current = pathname;
  }, [pathname, title]);

  return (
    <>
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          focusMain();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[1000] focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
      >
        Przejdź do treści
      </a>
      <Screen />
    </>
  );
}
