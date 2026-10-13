import { useEffect, useState } from "react";
import { listTags, type Tag } from "@/api/tags";

let cached: Promise<Tag[]> | null = null;

function loadTags(): Promise<Tag[]> {
  cached ??= listTags().catch((error) => {
    cached = null;
    throw error;
  });
  return cached;
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    loadTags()
      .then((loaded) => {
        if (cancelled) return;
        setTags(loaded);
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  return { tags, state };
}
