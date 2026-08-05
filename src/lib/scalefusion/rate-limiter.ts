/**
 * Scalefusion API rate limits (official):
 * - 30 requests per minute
 * - 43,200 requests per 24 hours
 * Exceeding returns HTTP 429.
 *
 * Modes:
 * - polite: stay under RPM with gaps (poll / device sync)
 * - aggressive: fire as fast as concurrency allows; on 429 pause everyone
 *   until Retry-After elapses, then resume
 */

const MAX_PER_MINUTE = Number(process.env.SCALEFUSION_MAX_RPM ?? 28);
const MIN_GAP_MS = Number(
  process.env.SCALEFUSION_MIN_GAP_MS ?? Math.ceil(60_000 / MAX_PER_MINUTE)
);
/** Tiny gap in aggressive mode only to avoid opening sockets in a tight loop. */
const AGGRESSIVE_MIN_GAP_MS = Number(
  process.env.SCALEFUSION_AGGRESSIVE_MIN_GAP_MS ?? 50
);

export type RateLimitMode = "polite" | "aggressive";

let mode: RateLimitMode = "polite";
let pausedUntil = 0;
let lastRequestAt = 0;
let chain: Promise<void> = Promise.resolve();
const recentTimestamps: number[] = [];
let waitLogCounter = 0;

function prune(now: number) {
  while (recentTimestamps.length > 0 && now - recentTimestamps[0]! >= 60_000) {
    recentTimestamps.shift();
  }
}

export function setRateLimitMode(next: RateLimitMode) {
  mode = next;
  console.log(`[scalefusion] rate-limit mode → ${next}`);
}

export function getRateLimitMode(): RateLimitMode {
  return mode;
}

/**
 * Called when Scalefusion returns HTTP 429.
 * Blocks all subsequent acquires until the cooldown ends.
 */
export function notifyRateLimited(retryAfterMs: number) {
  const wait = Math.max(1_000, retryAfterMs);
  const until = Date.now() + wait;
  if (until > pausedUntil) {
    pausedUntil = until;
    console.warn(
      `[scalefusion] HTTP 429 — pausing all requests for ${wait}ms (until ${new Date(until).toISOString()})`
    );
  }
}

async function waitWhilePaused(): Promise<void> {
  while (true) {
    const remaining = pausedUntil - Date.now();
    if (remaining <= 0) return;
    console.log(
      `[scalefusion] waiting for rate-limit release (${Math.ceil(remaining / 1000)}s left)`
    );
    await new Promise((r) => setTimeout(r, Math.min(remaining, 5_000)));
  }
}

/**
 * Wait until it is safe to make another Scalefusion API call.
 * Serializes slot acquisition so concurrent callers share one budget/pause gate.
 */
export function acquireScalefusionSlot(
  overrideMode?: RateLimitMode
): Promise<void> {
  const run = async () => {
    await waitWhilePaused();

    const activeMode = overrideMode ?? mode;
    const now = Date.now();
    prune(now);

    let waitMs = 0;
    if (activeMode === "polite") {
      const gapWait = Math.max(0, lastRequestAt + MIN_GAP_MS - now);
      const rpmWait =
        recentTimestamps.length >= MAX_PER_MINUTE
          ? Math.max(0, recentTimestamps[0]! + 60_000 - now)
          : 0;
      waitMs = Math.max(gapWait, rpmWait);
    } else {
      waitMs = Math.max(0, lastRequestAt + AGGRESSIVE_MIN_GAP_MS - now);
    }

    if (waitMs > 0) {
      waitLogCounter++;
      if (
        activeMode === "polite" &&
        (waitLogCounter === 1 || waitLogCounter % 25 === 0)
      ) {
        console.log(
          `[scalefusion] rate-limit wait ${waitMs}ms (rpm=${recentTimestamps.length}/${MAX_PER_MINUTE}, #${waitLogCounter})`
        );
      }
      await new Promise((r) => setTimeout(r, waitMs));
      await waitWhilePaused();
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
    mode,
    maxPerMinute: MAX_PER_MINUTE,
    minGapMs: mode === "aggressive" ? AGGRESSIVE_MIN_GAP_MS : MIN_GAP_MS,
    usedInLastMinute: recentTimestamps.length,
    pausedForMs: Math.max(0, pausedUntil - Date.now()),
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
