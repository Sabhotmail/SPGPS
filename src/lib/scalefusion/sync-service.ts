import { Prisma, SyncStatus, SyncType } from "@prisma/client";
import { prisma } from "../db";
import {
  ScalefusionDateOutOfRangeError,
  extractLocation,
  fetchDeviceLocations,
  fetchDevices,
  fetchLocationGeofence,
  parseRecordedAt,
  type ScalefusionLocation,
} from "./client";

function formatDateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfUtcDay(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function endOfUtcDay(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999Z`);
}

/** Dates from `days` ago through today (UTC), oldest first. */
export function buildBackfillDates(days: number, until = new Date()): string[] {
  const n = Math.max(1, Math.min(days, 90));
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(until);
    d.setUTCHours(12, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(formatDateUTC(d));
  }
  return dates;
}

async function insertLocations(
  deviceId: string,
  locations: ScalefusionLocation[],
  fetchedAt: Date
): Promise<number> {
  if (locations.length === 0) return 0;

  const rows = locations
    .map((loc) => {
      if (loc.latitude == null || loc.longitude == null) return null;
      return {
        deviceId,
        latitude: new Prisma.Decimal(loc.latitude),
        longitude: new Prisma.Decimal(loc.longitude),
        accuracy:
          loc.accuracy != null ? new Prisma.Decimal(loc.accuracy) : null,
        recordedAt: parseRecordedAt(loc),
        fetchedAt,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);

  if (rows.length === 0) return 0;

  let added = 0;
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const result = await prisma.locationRecord.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    added += result.count;
  }
  return added;
}

export async function syncDevicesFromScalefusion(): Promise<{
  synced: number;
  created: number;
}> {
  let created = 0;
  const sfDevices = await fetchDevices();

  for (const sf of sfDevices) {
    const deviceName = sf.device_name ?? sf.name ?? `Device ${sf.id}`;
    const existing = await prisma.device.findUnique({
      where: { scalefusionDeviceId: BigInt(sf.id) },
    });

    if (existing) {
      await prisma.device.update({
        where: { id: existing.id },
        data: { deviceName },
      });
    } else {
      await prisma.device.create({
        data: {
          scalefusionDeviceId: BigInt(sf.id),
          deviceName,
          employeeName: deviceName,
        },
      });
      created++;
    }
  }

  await prisma.syncLog.create({
    data: {
      syncType: SyncType.DEVICE_SYNC,
      status: SyncStatus.SUCCESS,
      recordsAdded: created,
    },
  });

  return { synced: sfDevices.length, created };
}

export async function pollLocationsFromScalefusion(): Promise<{
  recordsAdded: number;
  devicesUpdated: number;
}> {
  const sfDevices = await fetchLocationGeofence();
  let recordsAdded = 0;
  let devicesUpdated = 0;
  const fetchedAt = new Date();

  for (const sf of sfDevices) {
    const location = extractLocation(sf);
    if (!location) continue;

    const device = await prisma.device.findUnique({
      where: { scalefusionDeviceId: BigInt(sf.id) },
    });

    if (!device || !device.isActive) continue;

    const recordedAt = parseRecordedAt(location);
    const latitude = new Prisma.Decimal(location.latitude);
    const longitude = new Prisma.Decimal(location.longitude);
    const accuracy =
      location.accuracy != null
        ? new Prisma.Decimal(location.accuracy)
        : null;

    try {
      await prisma.locationRecord.create({
        data: {
          deviceId: device.id,
          latitude,
          longitude,
          accuracy,
          recordedAt,
          fetchedAt,
        },
      });
      recordsAdded++;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        // duplicate — skip
      } else {
        throw error;
      }
    }

    await prisma.device.update({
      where: { id: device.id },
      data: { lastSeenAt: recordedAt },
    });
    devicesUpdated++;
  }

  await prisma.syncLog.create({
    data: {
      syncType: SyncType.LOCATION_POLL,
      status: SyncStatus.SUCCESS,
      recordsAdded,
    },
  });

  return { recordsAdded, devicesUpdated };
}

export type BackfillOptions = {
  /** How many days back including today. Default 30. Capped at 90. */
  days?: number;
  /** Limit to one DB device id */
  deviceId?: string;
  /** Skip device+day if DB already has any points that day (default true) */
  skipExistingDays?: boolean;
  onProgress?: (message: string) => void;
};

/**
 * Pull Scalefusion per-device /locations.json?date= into PostgreSQL.
 * Expensive: ~activeDevices × days API calls. Use the worker script for full runs.
 */
export async function backfillLocationsFromScalefusion(
  options: BackfillOptions = {}
): Promise<{
  recordsAdded: number;
  requestsMade: number;
  devicesProcessed: number;
  daysProcessed: number;
  skippedDays: number;
  cutoffDate: string | null;
}> {
  const days = options.days ?? 30;
  const skipExisting = options.skipExistingDays ?? true;
  const log = options.onProgress ?? ((m: string) => console.log(m));

  const devices = await prisma.device.findMany({
    where: {
      isActive: true,
      ...(options.deviceId ? { id: options.deviceId } : {}),
    },
    orderBy: { deviceName: "asc" },
  });

  let dates = buildBackfillDates(days);
  let cutoffDate: string | null = null;
  let recordsAdded = 0;
  let requestsMade = 0;
  let skippedDays = 0;
  let daysProcessed = 0;
  const fetchedAt = new Date();

  log(
    `[backfill] ${devices.length} device(s) × ${dates.length} day(s) (skipExisting=${skipExisting})`
  );

  for (const device of devices) {
    const sfId = Number(device.scalefusionDeviceId);
    const label = device.employeeName ?? device.deviceName;

    for (const date of dates) {
      if (cutoffDate && date < cutoffDate) {
        skippedDays++;
        continue;
      }

      if (skipExisting) {
        const existing = await prisma.locationRecord.count({
          where: {
            deviceId: device.id,
            recordedAt: {
              gte: startOfUtcDay(date),
              lte: endOfUtcDay(date),
            },
          },
        });
        if (existing > 0) {
          skippedDays++;
          continue;
        }
      }

      try {
        const locations = await fetchDeviceLocations(sfId, date);
        requestsMade++;
        const added = await insertLocations(device.id, locations, fetchedAt);
        recordsAdded += added;
        daysProcessed++;

        if (added > 0 || locations.length > 0) {
          log(
            `[backfill] ${label} ${date}: +${added} (api ${locations.length})`
          );
        }
      } catch (error) {
        if (error instanceof ScalefusionDateOutOfRangeError) {
          requestsMade++;
          const min = error.minDate;
          // API requires date > minDate — usable from the next UTC day
          if (min) {
            const next = new Date(min);
            next.setUTCDate(next.getUTCDate() + 1);
            cutoffDate = formatDateUTC(next);
          } else {
            // current date is out of range; keep going only newer
            const next = new Date(`${date}T12:00:00.000Z`);
            next.setUTCDate(next.getUTCDate() + 1);
            cutoffDate = formatDateUTC(next);
          }
          dates = dates.filter((d) => !cutoffDate || d >= cutoffDate);
          log(
            `[backfill] Scalefusion retention cutoff — only dates >= ${cutoffDate}`
          );
          skippedDays++;
          continue;
        }
        throw error;
      }
    }
  }

  await prisma.syncLog.create({
    data: {
      syncType: SyncType.HISTORY_BACKFILL,
      status: SyncStatus.SUCCESS,
      recordsAdded,
      errorMessage: cutoffDate
        ? `cutoff>=${cutoffDate}; req=${requestsMade}; skip=${skippedDays}`
        : `req=${requestsMade}; skip=${skippedDays}`,
    },
  });

  return {
    recordsAdded,
    requestsMade,
    devicesProcessed: devices.length,
    daysProcessed,
    skippedDays,
    cutoffDate,
  };
}

export async function logSyncFailure(
  syncType: SyncType,
  errorMessage: string
): Promise<void> {
  await prisma.syncLog.create({
    data: {
      syncType,
      status: SyncStatus.FAILURE,
      errorMessage: errorMessage.slice(0, 1000),
    },
  });
}
