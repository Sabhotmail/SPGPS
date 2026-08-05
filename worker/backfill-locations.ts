/**
 * Backfill Scalefusion location history into PostgreSQL.
 *
 * Scalefusion retains ~30 days. SPGPS stores forever after backfill/poll.
 *
 * Usage:
 *   npx tsx --env-file=.env worker/backfill-locations.ts
 *   npx tsx --env-file=.env worker/backfill-locations.ts --days=30
 *   npx tsx --env-file=.env worker/backfill-locations.ts --days=7 --force
 *
 * Flags:
 *   --days=N     Days to pull including today (default 30, max 90)
 *   --force      Re-fetch days that already have DB rows
 *   --device=ID  Only backfill one DB device UUID
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
  let force = false;
  let deviceId: string | undefined;

  for (const arg of argv) {
    if (arg.startsWith("--days=")) {
      days = Number(arg.slice("--days=".length));
    } else if (arg === "--force") {
      force = true;
    } else if (arg.startsWith("--device=")) {
      deviceId = arg.slice("--device=".length);
    }
  }

  if (!Number.isFinite(days) || days < 1) days = 30;
  days = Math.min(90, Math.floor(days));

  return { days, force, deviceId };
}

async function main() {
  const { days, force, deviceId } = parseArgs(process.argv.slice(2));
  const stats = getRateLimitStats();

  const deviceCount = await prisma.device.count({
    where: { isActive: true, ...(deviceId ? { id: deviceId } : {}) },
  });

  const worstCaseRequests = deviceCount * days;
  const estMinutes = Math.ceil(worstCaseRequests / Math.max(1, stats.maxPerMinute));

  console.log("SPGPS history backfill");
  console.log(`  devices: ${deviceCount}`);
  console.log(`  days: ${days}`);
  console.log(`  skip existing days: ${!force}`);
  console.log(`  rate limit: ${stats.maxPerMinute}/min, gap ${stats.minGapMs}ms`);
  console.log(
    `  estimate: up to ~${worstCaseRequests} API calls (~${estMinutes} min if none skipped)`
  );
  console.log("");

  try {
    const result = await backfillLocationsFromScalefusion({
      days,
      deviceId,
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
