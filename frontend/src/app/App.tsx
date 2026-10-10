import { useEffect, useRef } from "react";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Plan from "@/pages/plan";
import { useRoute, type Route } from "@/shared/lib/route";

const TITLES: Record<Route, string> = {
  landing: "Atlas – trasy spacerowe po Twoich zainteresowaniach",
  login: "Logowanie – Atlas",
  plan: "Zaplanuj podróż – Atlas",
};

function focusMain() {
  document.getElementById("main")?.focus({ preventScroll: true });
}

export default function App() {
  const route = useRoute();
  const prevRoute = useRef(route);

  useEffect(() => {
    document.title = TITLES[route];
    if (prevRoute.current !== route) focusMain();
    prevRoute.current = route;
  }, [route]);

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
      {route === "login" ? (
        <Login />
      ) : route === "plan" ? (
        <Plan />
      ) : (
        <Landing />
      )}
    </>
  );
}
