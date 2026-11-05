import { Prisma } from "@prisma/client";
import { getAppTimezone } from "@/lib/app-timezone";
import { prisma } from "@/lib/db";

export type LatestLocationInput = {
  latitude: Prisma.Decimal | number;
  longitude: Prisma.Decimal | number;
  accuracy?: Prisma.Decimal | number | null;
  recordedAt: Date;
};

/** Update denormalized latest GPS on device if `recordedAt` is newer (or equal). */
export async function upsertDeviceLatestLocation(
  deviceId: string,
  latest: LatestLocationInput
): Promise<void> {
  const lat =
    latest.latitude instanceof Prisma.Decimal
      ? latest.latitude
      : new Prisma.Decimal(latest.latitude);
  const lng =
    latest.longitude instanceof Prisma.Decimal
      ? latest.longitude
      : new Prisma.Decimal(latest.longitude);
  const accuracy =
    latest.accuracy == null
      ? null
      : latest.accuracy instanceof Prisma.Decimal
        ? latest.accuracy
        : new Prisma.Decimal(latest.accuracy);

  await prisma.$executeRaw`
    UPDATE devices
    SET
      last_latitude = ${lat},
      last_longitude = ${lng},
      last_accuracy = ${accuracy},
      last_seen_at = ${latest.recordedAt},
      updated_at = NOW()
    WHERE id = ${deviceId}
      AND (last_seen_at IS NULL OR last_seen_at <= ${latest.recordedAt})
  `;
}

/**
 * Recompute location_day_stats for a device over [from, to] recorded_at range
 * (inclusive), using APP_TIMEZONE calendar days.
 */
export async function refreshLocationDayStats(
  deviceId: string,
  from: Date,
  to: Date
): Promise<void> {
  const tz = getAppTimezone();
  await prisma.$executeRaw`
    INSERT INTO location_day_stats (device_id, day, point_count)
    SELECT
      device_id,
      (recorded_at AT TIME ZONE ${tz})::date AS day,
      COUNT(*)::int AS point_count
    FROM location_records
    WHERE device_id = ${deviceId}
      AND recorded_at >= ${from}
      AND recorded_at <= ${to}
    GROUP BY device_id, day
    ON CONFLICT (device_id, day) DO UPDATE
    SET point_count = EXCLUDED.point_count
  `;
}

/** Delete location_records older than cutoff; refresh affected day stats. */
export async function pruneLocationRecordsOlderThan(
  cutoff: Date,
  options?: { batchSize?: number; onProgress?: (deleted: number) => void }
): Promise<{ deleted: number }> {
  const batchSize = options?.batchSize ?? 50_000;
  let deleted = 0;

  for (;;) {
    const result = await prisma.$executeRaw`
      WITH doomed AS (
        SELECT id
        FROM location_records
        WHERE recorded_at < ${cutoff}
        LIMIT ${batchSize}
      )
      DELETE FROM location_records lr
      USING doomed
      WHERE lr.id = doomed.id
    `;
    const n = Number(result);
    deleted += n;
    options?.onProgress?.(deleted);
    if (n < batchSize) break;
  }

  // Day stats for old days: delete rows before cutoff's calendar day in app TZ
  const tz = getAppTimezone();
  await prisma.$executeRaw`
    DELETE FROM location_day_stats
    WHERE day < (${cutoff} AT TIME ZONE ${tz})::date
  `;

  return { deleted };
}
