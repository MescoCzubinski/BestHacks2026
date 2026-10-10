import { useEffect, useState } from "react";

export type Route = "landing" | "login" | "app" | "plan";

const ROUTES: Route[] = ["landing", "login", "app", "plan"];

function read(): Route {
  const name = window.location.hash.replace("#/", "");
  return (ROUTES as string[]).includes(name) ? (name as Route) : "landing";
}

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
