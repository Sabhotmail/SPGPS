-- Denormalized latest GPS on devices (map latest API)
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "last_latitude" DECIMAL(10,7);
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "last_longitude" DECIMAL(10,7);
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "last_accuracy" DECIMAL(10,2);

-- Per-device calendar day counts for available-dates (APP_TIMEZONE = Asia/Bangkok default)
CREATE TABLE IF NOT EXISTS "location_day_stats" (
    "device_id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "point_count" INTEGER NOT NULL,
    CONSTRAINT "location_day_stats_pkey" PRIMARY KEY ("device_id","day")
);

CREATE INDEX IF NOT EXISTS "location_day_stats_device_id_day_idx"
  ON "location_day_stats"("device_id", "day" DESC);

ALTER TABLE "location_day_stats"
  DROP CONSTRAINT IF EXISTS "location_day_stats_device_id_fkey";
ALTER TABLE "location_day_stats"
  ADD CONSTRAINT "location_day_stats_device_id_fkey"
  FOREIGN KEY ("device_id") REFERENCES "devices"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- One-time backfill: latest point per device via LATERAL (index seeks)
UPDATE "devices" AS d SET
  "last_latitude" = lr.latitude,
  "last_longitude" = lr.longitude,
  "last_accuracy" = lr.accuracy,
  "last_seen_at" = COALESCE(d."last_seen_at", lr.recorded_at)
FROM (
  SELECT d2.id AS device_id, lr.*
  FROM "devices" d2
  INNER JOIN LATERAL (
    SELECT latitude, longitude, accuracy, recorded_at
    FROM "location_records"
    WHERE device_id = d2.id
    ORDER BY recorded_at DESC
    LIMIT 1
  ) lr ON true
) AS lr
WHERE d.id = lr.device_id;

-- One-time backfill: day stats in Asia/Bangkok (rebuild if APP_TIMEZONE changes)
INSERT INTO "location_day_stats" ("device_id", "day", "point_count")
SELECT
  device_id,
  (recorded_at AT TIME ZONE 'Asia/Bangkok')::date AS day,
  COUNT(*)::int AS point_count
FROM "location_records"
GROUP BY device_id, day
ON CONFLICT ("device_id", "day") DO UPDATE
SET "point_count" = EXCLUDED."point_count";
