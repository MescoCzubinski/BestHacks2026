import { useCallback, useEffect, useState } from "react";
import { checkHealth } from "../api/checkHealth";

export type ApiStatus = "checking" | "up" | "down";

export function useApiStatus() {
  const [status, setStatus] = useState<ApiStatus>("checking");

  const check = useCallback(() => {
    setStatus("checking");
    checkHealth().then((ok) => setStatus(ok ? "up" : "down"));
  }, []);

  useEffect(check, [check]);

  return { status, check };
}
