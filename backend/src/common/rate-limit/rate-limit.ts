import { Throttle } from "@nestjs/throttler";

export const RATE_WINDOW_MS = 60_000; // ms, one minute
export const DEFAULT_REQUESTS_PER_WINDOW = 120;
const EXPENSIVE_REQUESTS_PER_WINDOW = 10;
const INTERNAL_REQUESTS_PER_WINDOW = 600;

/** Route planning and on-demand embedding: CPU-heavy or calling paid upstreams. */
export const ExpensiveRateLimit = () =>
  Throttle({
    default: { limit: EXPENSIVE_REQUESTS_PER_WINDOW, ttl: RATE_WINDOW_MS },
  });

/** Bulk calls from the fetcher inside the cluster; not reachable through the ingress. */
export const InternalRateLimit = () =>
  Throttle({
    default: { limit: INTERNAL_REQUESTS_PER_WINDOW, ttl: RATE_WINDOW_MS },
  });
