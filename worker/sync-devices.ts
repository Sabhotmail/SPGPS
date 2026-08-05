import { syncDevicesFromScalefusion, logSyncFailure } from "../src/lib/scalefusion/sync-service";
import { SyncType } from "@prisma/client";

async function main(): Promise<void> {
  try {
    const result = await syncDevicesFromScalefusion();
    console.log(
      `[${new Date().toISOString()}] Device sync complete: ${result.synced} total, ${result.created} new`
    );
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${new Date().toISOString()}] Device sync failed:`, message);
    await logSyncFailure(SyncType.DEVICE_SYNC, message);
    process.exit(1);
  }
}

main();
