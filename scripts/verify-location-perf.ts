import { prisma } from "../src/lib/db";

async function main() {
  const t0 = Date.now();
  const devices = await prisma.device.findMany({
    where: { isActive: true },
    select: {
      id: true,
      lastLatitude: true,
      lastLongitude: true,
      lastAccuracy: true,
      lastSeenAt: true,
    },
  });
  console.log(
    "devices with denormalized latest",
    devices.filter((d) => d.lastLatitude != null).length,
    "/",
    devices.length,
    "in",
    Date.now() - t0,
    "ms"
  );

  const sample = devices.find((d) => d.lastLatitude != null);
  if (!sample) return;

  const t1 = Date.now();
  const dates = await prisma.locationDayStat.findMany({
    where: { deviceId: sample.id },
    orderBy: { day: "desc" },
  });
  console.log(
    "day stats for sample device",
    dates.length,
    "rows in",
    Date.now() - t1,
    "ms"
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
