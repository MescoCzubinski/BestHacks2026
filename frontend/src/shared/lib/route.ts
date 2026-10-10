import { useEffect, useState } from "react";

export type Route = "landing" | "login" | "app";

const ROUTES: Route[] = ["landing", "login", "app"];

function read(): Route {
  const name = window.location.hash.replace("#/", "");
  return (ROUTES as string[]).includes(name) ? (name as Route) : "landing";
}

/** Tiny hash router: #/landing, #/login, #/app. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export const href = (route: Route) => `#/${route}`;
