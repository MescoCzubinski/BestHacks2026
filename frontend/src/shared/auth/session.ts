import { useSyncExternalStore } from "react";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type Session = { token: string; user: SessionUser };

const STORAGE_KEY = "atlas.session";

let current: Session | null | undefined;
const listeners = new Set<() => void>();

function load(): Session | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function getSession(): Session | null {
  if (current === undefined) current = load();
  return current;
}

export function setSession(session: Session | null): void {
  current = session;
  try {
    if (session)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked; the session then lasts until the tab closes.
  }
  listeners.forEach((notify) => notify());
}

export function clearSession(): void {
  setSession(null);
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, getSession, () => null);
}
