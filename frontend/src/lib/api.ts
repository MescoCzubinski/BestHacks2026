/** Backend base URL, baked in at build time (VITE_API_URL). */
export const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
