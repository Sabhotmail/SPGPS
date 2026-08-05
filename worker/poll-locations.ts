import {
  logSyncFailure,
  pollLocationsFromScalefusion,
  syncDevicesFromScalefusion,
} from "../src/lib/scalefusion/sync-service";
import { SyncType } from "@prisma/client";
import { getRateLimitStats } from "../src/lib/scalefusion/rate-limiter";

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 180000);
const DAILY_SYNC_MS = 24 * 60 * 60 * 1000;

let pollInFlight = false;
let syncInFlight = false;

async function runPollCycle(): Promise<void> {
  if (pollInFlight) {
    console.warn(
      `[${new Date().toISOString()}] Skip poll — previous cycle still running`
    );
    return;
  }

  pollInFlight = true;
  try {
    const result = await pollLocationsFromScalefusion();
    console.log(
      `[${new Date().toISOString()}] Poll complete: ${result.recordsAdded} records, ${result.devicesUpdated} devices`,
      getRateLimitStats()
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${new Date().toISOString()}] Poll failed:`, message);
    await logSyncFailure(SyncType.LOCATION_POLL, message);
  } finally {
    pollInFlight = false;
  }
}

async function runDailySync(): Promise<void> {
  if (syncInFlight || pollInFlight) {
    console.warn(
      `[${new Date().toISOString()}] Defer device sync — another Scalefusion job is running`
    );
    return;
  }

  syncInFlight = true;
  try {
    console.log(`[${new Date().toISOString()}] Running daily device sync...`);
    const result = await syncDevicesFromScalefusion();
    console.log(
      `[${new Date().toISOString()}] Daily sync: ${result.synced} devices, ${result.created} new`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Daily device sync failed:", message);
    await logSyncFailure(SyncType.DEVICE_SYNC, message);
  } finally {
    syncInFlight = false;
  }
}

async function main(): Promise<void> {
  const stats = getRateLimitStats();
  console.log(
    `SPGPS location worker started (interval: ${POLL_INTERVAL_MS}ms, maxRPM: ${stats.maxPerMinute}, minGap: ${stats.minGapMs}ms)`
  );
  console.log(
    "Strategy: 1 bulk call to location_geofence.json per cycle (avoids per-device spam)"
  );

  // Initial device sync once so poll has devices to attach locations to.
  try {
    const result = await syncDevicesFromScalefusion();
    console.log(
      `[${new Date().toISOString()}] Startup device sync: ${result.synced} devices, ${result.created} new`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Startup device sync failed:", message);
    await logSyncFailure(SyncType.DEVICE_SYNC, message);
  }

  await runPollCycle();
  setInterval(runPollCycle, POLL_INTERVAL_MS);
  setInterval(runDailySync, DAILY_SYNC_MS);
}

main().catch((error) => {
  console.error("Worker fatal error:", error);
  process.exit(1);
});
