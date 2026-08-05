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
import { setRateLimitMode } from "./rate-limiter";

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

/**
 * Pull one device's locations for a given day (default: today UTC).
 * Uses /locations.json?date= — 1 API call.
 */
export async function fetchLocationsForDevice(options: {
  deviceId: string;
  date?: string;
}): Promise<{
  recordsAdded: number;
  apiCount: number;
  date: string;
  lastSeenAt: string | null;
  deviceName: string;
}> {
  const device = await prisma.device.findUnique({
    where: { id: options.deviceId },
  });
  if (!device) {
    throw new Error("Device not found");
  }

  const date = options.date ?? formatDateUTC(new Date());
  const sfId = Number(device.scalefusionDeviceId);
  const fetchedAt = new Date();

  const locations = await fetchDeviceLocations(sfId, date);
  const recordsAdded = await insertLocations(device.id, locations, fetchedAt);

  let lastSeenAt: Date | null = device.lastSeenAt;
  if (locations.length > 0) {
    const latest = locations.reduce((a, b) => {
      const ta = parseRecordedAt(a).getTime();
      const tb = parseRecordedAt(b).getTime();
      return tb >= ta ? b : a;
    });
    lastSeenAt = parseRecordedAt(latest);
    await prisma.device.update({
      where: { id: device.id },
      data: { lastSeenAt },
    });
  }

  await prisma.syncLog.create({
    data: {
      syncType: SyncType.LOCATION_POLL,
      status: SyncStatus.SUCCESS,
      recordsAdded,
      errorMessage: `device=${device.deviceName}; date=${date}; api=${locations.length}`,
    },
  });

  return {
    recordsAdded,
    apiCount: locations.length,
    date,
    lastSeenAt: lastSeenAt?.toISOString() ?? null,
    deviceName: device.employeeName ?? device.deviceName,
  };
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
  const fetchedAt = new Date();

  const rows: {
    deviceId: string;
    latitude: Prisma.Decimal;
    longitude: Prisma.Decimal;
    accuracy: Prisma.Decimal | null;
    recordedAt: Date;
    fetchedAt: Date;
  }[] = [];
  const lastSeenByDevice = new Map<string, Date>();

  for (const sf of sfDevices) {
    const location = extractLocation(sf);
    if (!location) continue;

    const device = await prisma.device.findUnique({
      where: { scalefusionDeviceId: BigInt(sf.id) },
    });

    if (!device || !device.isActive) continue;

    const recordedAt = parseRecordedAt(location);
    rows.push({
      deviceId: device.id,
      latitude: new Prisma.Decimal(location.latitude),
      longitude: new Prisma.Decimal(location.longitude),
      accuracy:
        location.accuracy != null
          ? new Prisma.Decimal(location.accuracy)
          : null,
      recordedAt,
      fetchedAt,
    });
    lastSeenByDevice.set(device.id, recordedAt);
  }

  let recordsAdded = 0;
  if (rows.length > 0) {
    const result = await prisma.locationRecord.createMany({
      data: rows,
      skipDuplicates: true,
    });
    recordsAdded = result.count;
  }

  for (const [deviceId, recordedAt] of lastSeenByDevice) {
    await prisma.device.update({
      where: { id: deviceId },
      data: { lastSeenAt: recordedAt },
    });
  }

  await prisma.syncLog.create({
    data: {
      syncType: SyncType.LOCATION_POLL,
      status: SyncStatus.SUCCESS,
      recordsAdded,
    },
  });

  return { recordsAdded, devicesUpdated: lastSeenByDevice.size };
}

export type BackfillOptions = {
  /** How many days back including today. Default 30. Capped at 90. */
  days?: number;
  /** Limit to one DB device id */
  deviceId?: string;
  /** Skip device+day if DB already has any points that day (default true) */
  skipExistingDays?: boolean;
  /** Parallel API fetches. Default 8 in aggressive mode. */
  concurrency?: number;
  onProgress?: (message: string) => void;
};

type BackfillJob = {
  deviceId: string;
  sfId: number;
  label: string;
  date: string;
};

async function loadExistingDayKeys(
  deviceIds: string[],
  fromDate: string,
  toDate: string
): Promise<Set<string>> {
  if (deviceIds.length === 0) return new Set();

  const rows = await prisma.$queryRaw<{ device_id: string; date: string }[]>`
    SELECT
      device_id,
      to_char(recorded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date
    FROM location_records
    WHERE device_id IN (${Prisma.join(deviceIds)})
      AND recorded_at >= ${startOfUtcDay(fromDate)}
      AND recorded_at <= ${endOfUtcDay(toDate)}
    GROUP BY device_id, 2
  `;

  return new Set(rows.map((r) => `${r.device_id}:${r.date}`));
}

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
  const concurrency = Math.max(
    1,
    Math.min(12, Math.floor(options.concurrency ?? 8))
  );
  const log = options.onProgress ?? ((m: string) => console.log(m));

  setRateLimitMode("aggressive");
  try {
    return await runBackfillJobs({
      days,
      skipExisting,
      concurrency,
      deviceId: options.deviceId,
      log,
    });
  } finally {
    setRateLimitMode("polite");
  }
}

async function runBackfillJobs(args: {
  days: number;
  skipExisting: boolean;
  concurrency: number;
  deviceId?: string;
  log: (message: string) => void;
}): Promise<{
  recordsAdded: number;
  requestsMade: number;
  devicesProcessed: number;
  daysProcessed: number;
  skippedDays: number;
  cutoffDate: string | null;
}> {
  const { days, skipExisting, concurrency, log } = args;

  const devices = await prisma.device.findMany({
    where: {
      isActive: true,
      ...(args.deviceId ? { id: args.deviceId } : {}),
    },
    orderBy: { deviceName: "asc" },
  });

  const dates = buildBackfillDates(days);
  let cutoffDate: string | null = null;
  let recordsAdded = 0;
  let requestsMade = 0;
  let skippedDays = 0;
  let daysProcessed = 0;
  const fetchedAt = new Date();

  const existingKeys = skipExisting
    ? await loadExistingDayKeys(
        devices.map((d) => d.id),
        dates[0]!,
        dates[dates.length - 1]!
      )
    : new Set<string>();

  const jobs: BackfillJob[] = [];
  for (const device of devices) {
    const sfId = Number(device.scalefusionDeviceId);
    const label = device.employeeName ?? device.deviceName;
    for (const date of dates) {
      if (existingKeys.has(`${device.id}:${date}`)) {
        skippedDays++;
        continue;
      }
      jobs.push({ deviceId: device.id, sfId, label, date });
    }
  }

  log(
    `[backfill] ${devices.length} device(s) × ${dates.length} day(s) → ${jobs.length} jobs (concurrency=${concurrency}, mode=aggressive/fire-until-429)`
  );

  let cursor = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = cursor++;
      if (index >= jobs.length) return;
      const job = jobs[index]!;

      if (cutoffDate && job.date < cutoffDate) {
        skippedDays++;
        continue;
      }

      try {
        const locations = await fetchDeviceLocations(job.sfId, job.date);
        requestsMade++;
        const added = await insertLocations(
          job.deviceId,
          locations,
          fetchedAt
        );
        recordsAdded += added;
        daysProcessed++;

        if (added > 0 || locations.length > 0) {
          log(
            `[backfill] ${job.label} ${job.date}: +${added} (api ${locations.length})`
          );
        }
      } catch (error) {
        if (error instanceof ScalefusionDateOutOfRangeError) {
          requestsMade++;
          const min = error.minDate;
          let nextCutoff: string;
          if (min) {
            const next = new Date(min);
            next.setUTCDate(next.getUTCDate() + 1);
            nextCutoff = formatDateUTC(next);
          } else {
            const next = new Date(`${job.date}T12:00:00.000Z`);
            next.setUTCDate(next.getUTCDate() + 1);
            nextCutoff = formatDateUTC(next);
          }
          if (!cutoffDate || nextCutoff > cutoffDate) {
            cutoffDate = nextCutoff;
            log(
              `[backfill] Scalefusion retention cutoff — only dates >= ${cutoffDate}`
            );
          }
          skippedDays++;
          continue;
        }
        throw error;
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, Math.max(1, jobs.length)) },
      () => worker()
    )
  );

  await prisma.syncLog.create({
    data: {
      syncType: SyncType.HISTORY_BACKFILL,
      status: SyncStatus.SUCCESS,
      recordsAdded,
      errorMessage: cutoffDate
        ? `cutoff>=${cutoffDate}; req=${requestsMade}; skip=${skippedDays}; conc=${concurrency}; mode=aggressive`
        : `req=${requestsMade}; skip=${skippedDays}; conc=${concurrency}; mode=aggressive`,
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
