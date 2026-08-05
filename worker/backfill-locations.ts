/**
 * Backfill Scalefusion location history into PostgreSQL.
 *
 * Scalefusion retains ~30 days. SPGPS stores forever after backfill/poll.
 *
 * Usage:
 *   npm run worker:backfill
 *   npm run worker:backfill -- --days=30 --concurrency=6
 *   npm run worker:backfill -- --days=7 --force
 *
 * Flags:
 *   --days=N          Days to pull including today (default 30, max 90)
 *   --concurrency=N   Parallel fetches (default 8, max 12)
 *   --force           Re-fetch days that already have DB rows
 *   --device=ID       Only backfill one DB device UUID
 *
 * Strategy: aggressive fire-until-429. On HTTP 429, all workers pause
 * until Retry-After, then resume. Poll/device sync stay in polite mode.
 */
import {
  backfillLocationsFromScalefusion,
  logSyncFailure,
} from "../src/lib/scalefusion/sync-service";
import { getRateLimitStats } from "../src/lib/scalefusion/rate-limiter";
import { SyncType } from "@prisma/client";
import { prisma } from "../src/lib/db";

function parseArgs(argv: string[]) {
  let days = Number(process.env.BACKFILL_DAYS ?? 30);
  let concurrency = Number(process.env.BACKFILL_CONCURRENCY ?? 8);
  let force = false;
  let deviceId: string | undefined;

  for (const arg of argv) {
    if (arg.startsWith("--days=")) {
      days = Number(arg.slice("--days=".length));
    } else if (arg.startsWith("--concurrency=")) {
      concurrency = Number(arg.slice("--concurrency=".length));
    } else if (arg === "--force") {
      force = true;
    } else if (arg.startsWith("--device=")) {
      deviceId = arg.slice("--device=".length);
    }
  }

  if (!Number.isFinite(days) || days < 1) days = 30;
  days = Math.min(90, Math.floor(days));
  if (!Number.isFinite(concurrency) || concurrency < 1) concurrency = 8;
  concurrency = Math.min(12, Math.floor(concurrency));

  return { days, concurrency, force, deviceId };
}

async function main() {
  const { days, concurrency, force, deviceId } = parseArgs(
    process.argv.slice(2)
  );
  const stats = getRateLimitStats();

  const deviceCount = await prisma.device.count({
    where: { isActive: true, ...(deviceId ? { id: deviceId } : {}) },
  });

  const worstCaseRequests = deviceCount * days;

  console.log("SPGPS history backfill");
  console.log(`  devices: ${deviceCount}`);
  console.log(`  days: ${days}`);
  console.log(`  concurrency: ${concurrency}`);
  console.log(`  skip existing days: ${!force}`);
  console.log(`  strategy: fire until 429, then wait Retry-After`);
  console.log(
    `  rate limit (polite fallback): ${stats.maxPerMinute}/min; aggressive min gap ${stats.minGapMs}ms`
  );
  console.log(
    `  estimate: up to ~${worstCaseRequests} API calls (faster than polite; bursts until 429)`
  );
  console.log("");

  try {
    const result = await backfillLocationsFromScalefusion({
      days,
      deviceId,
      concurrency,
      skipExistingDays: !force,
      onProgress: (m) => console.log(m),
    });

    console.log("");
    console.log("Done:");
    console.log(`  records added: ${result.recordsAdded}`);
    console.log(`  API requests: ${result.requestsMade}`);
    console.log(`  days fetched: ${result.daysProcessed}`);
    console.log(`  skipped: ${result.skippedDays}`);
    if (result.cutoffDate) {
      console.log(`  Scalefusion cutoff: >= ${result.cutoffDate}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Backfill failed:", message);
    await logSyncFailure(SyncType.HISTORY_BACKFILL, message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
