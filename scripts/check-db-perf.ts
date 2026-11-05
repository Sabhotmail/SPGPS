import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.$queryRaw<
    { locations: bigint; devices: bigint; locations_size: string }[]
  >`
    SELECT
      (SELECT count(*)::bigint FROM location_records) AS locations,
      (SELECT count(*)::bigint FROM devices) AS devices,
      (SELECT pg_size_pretty(pg_total_relation_size('location_records'))) AS locations_size
  `;
  console.log("table", counts[0]);

  const ids = (
    await prisma.device.findMany({
      where: { isActive: true },
      select: { id: true },
    })
  ).map((d) => d.id);
  console.log("active devices", ids.length);

  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");

  const t1 = Date.now();
  const explainLateral = await prisma.$queryRawUnsafe<{ "QUERY PLAN": string }[]>(
    `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
    SELECT d.id, lr.recorded_at
    FROM devices d
    INNER JOIN LATERAL (
      SELECT recorded_at
      FROM location_records
      WHERE device_id = d.id
      ORDER BY recorded_at DESC
      LIMIT 1
    ) lr ON true
    WHERE d.id IN (${placeholders})
  `,
    ...ids
  );
  console.log("\nLATERAL EXPLAIN ms", Date.now() - t1);
  console.log(explainLateral.map((r) => r["QUERY PLAN"]).join("\n"));

  const t2 = Date.now();
  const rows = await prisma.$queryRawUnsafe(
    `
    SELECT d.id AS "deviceId", lr.latitude, lr.longitude, lr.accuracy, lr.recorded_at AS "recordedAt"
    FROM devices d
    INNER JOIN LATERAL (
      SELECT latitude, longitude, accuracy, recorded_at
      FROM location_records
      WHERE device_id = d.id
      ORDER BY recorded_at DESC
      LIMIT 1
    ) lr ON true
    WHERE d.id IN (${placeholders})
  `,
    ...ids
  );
  console.log("\nLATERAL query rows", (rows as unknown[]).length, "in", Date.now() - t2, "ms");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
