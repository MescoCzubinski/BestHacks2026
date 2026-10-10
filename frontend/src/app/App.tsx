import Landing from "@/pages/landing";
import Login from "@/pages/login";
import MapApp from "@/pages/map-app";
import { useRoute } from "@/shared/lib/route";

export default function App() {
  const route = useRoute();
  if (route === "login") return <Login />;
  if (route === "app") return <MapApp />;
  return <Landing />;
}
