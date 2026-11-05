/**
 * One-time backfill after schema push:
 * - devices.last_latitude/longitude/accuracy from latest location_records
 * - location_day_stats from location_records (APP_TIMEZONE)
 *
 *   npx tsx --env-file=.env scripts/backfill-location-perf.ts
 */
import { prisma } from "../src/lib/db";
import { getAppTimezone } from "../src/lib/app-timezone";

async function main() {
  console.log("Backfilling devices.last_* from location_records (LATERAL)…");
  const t0 = Date.now();
  await prisma.$executeRaw`
    UPDATE devices AS d SET
      last_latitude = lr.latitude,
      last_longitude = lr.longitude,
      last_accuracy = lr.accuracy,
      last_seen_at = COALESCE(d.last_seen_at, lr.recorded_at),
      updated_at = NOW()
    FROM (
      SELECT d2.id AS device_id, lr.latitude, lr.longitude, lr.accuracy, lr.recorded_at
      FROM devices d2
      INNER JOIN LATERAL (
        SELECT latitude, longitude, accuracy, recorded_at
        FROM location_records
        WHERE device_id = d2.id
        ORDER BY recorded_at DESC
        LIMIT 1
      ) lr ON true
    ) AS lr
    WHERE d.id = lr.device_id
  `;
  console.log("devices latest done in", Date.now() - t0, "ms");

  const tz = getAppTimezone();
  console.log(`Rebuilding location_day_stats (${tz}) — may take a few minutes…`);
  const t1 = Date.now();
  await prisma.$executeRaw`
    INSERT INTO location_day_stats (device_id, day, point_count)
    SELECT
      device_id,
      (recorded_at AT TIME ZONE ${tz})::date AS day,
      COUNT(*)::int AS point_count
    FROM location_records
    GROUP BY device_id, day
    ON CONFLICT (device_id, day) DO UPDATE
    SET point_count = EXCLUDED.point_count
  `;
  console.log("day stats done in", Date.now() - t1, "ms");

  const [devWith, days] = await Promise.all([
    prisma.device.count({ where: { lastLatitude: { not: null } } }),
    prisma.locationDayStat.count(),
  ]);
  console.log({ devicesWithLatest: devWith, dayStatRows: days });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
