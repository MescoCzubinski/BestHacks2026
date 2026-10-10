import { useEffect, useRef } from "react";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import MapApp from "@/pages/map-app";
import { useRoute, type Route } from "@/shared/lib/route";

const TITLES: Record<Route, string> = {
  landing: "Atlas – trasy spacerowe po Twoich zainteresowaniach",
  login: "Logowanie – Atlas",
  app: "Mapa – Atlas",
};

function focusMain() {
  document.getElementById("main")?.focus({ preventScroll: true });
}

export default function App() {
  const route = useRoute();
  const prevRoute = useRef(route);

  // WCAG 2.4.2 / 2.4.3: a new route gets its own title and keyboard focus.
  useEffect(() => {
    document.title = TITLES[route];
    // First load keeps focus at the top so the skip link is the first Tab stop.
    if (prevRoute.current !== route) focusMain();
    prevRoute.current = route;
  }, [route]);

  return (
    <>
      {/* WCAG 2.4.1. A button, not href="#main": the hash drives the router. */}
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
      {route === "login" ? (
        <Login />
      ) : route === "app" ? (
        <MapApp />
      ) : (
        <Landing />
      )}
    </>
  );
}
