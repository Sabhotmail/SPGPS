/**
 * Scalefusion API rate limits (official):
 * - 30 requests per minute
 * - 43,200 requests per 24 hours
 * Exceeding returns HTTP 429.
 *
 * We stay under the limit with a conservative token bucket.
 */

const MAX_PER_MINUTE = Number(process.env.SCALEFUSION_MAX_RPM ?? 20);
const MIN_GAP_MS = Number(
  process.env.SCALEFUSION_MIN_GAP_MS ?? Math.ceil(60_000 / MAX_PER_MINUTE)
);

let lastRequestAt = 0;
let chain: Promise<void> = Promise.resolve();
const recentTimestamps: number[] = [];

function prune(now: number) {
  while (recentTimestamps.length > 0 && now - recentTimestamps[0]! >= 60_000) {
    recentTimestamps.shift();
  }
}

/**
 * Wait until it is safe to make another Scalefusion API call.
 * Serializes all callers so concurrent sync/poll/backfill share one budget.
 */
export function acquireScalefusionSlot(): Promise<void> {
  const run = async () => {
    const now = Date.now();
    prune(now);

    const gapWait = Math.max(0, lastRequestAt + MIN_GAP_MS - now);
    const rpmWait =
      recentTimestamps.length >= MAX_PER_MINUTE
        ? Math.max(0, recentTimestamps[0]! + 60_000 - now)
        : 0;

    const waitMs = Math.max(gapWait, rpmWait);
    if (waitMs > 0) {
      console.log(
        `[scalefusion] rate-limit wait ${waitMs}ms (rpm=${recentTimestamps.length}/${MAX_PER_MINUTE})`
      );
      await new Promise((r) => setTimeout(r, waitMs));
    }

    const stamped = Date.now();
    lastRequestAt = stamped;
    recentTimestamps.push(stamped);
    prune(stamped);
  };

  const next = chain.then(run, run);
  chain = next.catch(() => undefined);
  return next;
}

export function getRateLimitStats() {
  prune(Date.now());
  return {
    maxPerMinute: MAX_PER_MINUTE,
    minGapMs: MIN_GAP_MS,
    usedInLastMinute: recentTimestamps.length,
  };
}

export function parseRetryAfterMs(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (!header) return null;

  const asSeconds = Number(header);
  if (!Number.isNaN(asSeconds) && asSeconds >= 0) {
    return Math.ceil(asSeconds * 1000);
  }

  const asDate = Date.parse(header);
  if (!Number.isNaN(asDate)) {
    return Math.max(0, asDate - Date.now());
  }

  return null;
}
