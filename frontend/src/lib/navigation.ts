const listeners = new Set<() => void>();

export function subscribeToLocation(notify: () => void): () => void {
  listeners.add(notify);
  window.addEventListener("popstate", notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("popstate", notify);
  };
}

export function currentLocation(): string {
  return window.location.pathname + window.location.search;
}

export function navigate(to: string, { replace = false } = {}): void {
  if (replace) window.history.replaceState(null, "", to);
  else window.history.pushState(null, "", to);
  listeners.forEach((notify) => notify());
}
