import { prisma } from "../src/lib/db";

async function main() {
  try {
    const users = await prisma.user.count();
    const devices = await prisma.device.count();
    const locs = await prisma.locationRecord.count();
    const logs = await prisma.syncLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    console.log(JSON.stringify({ users, devices, locs, logs }, null, 2));
  } catch (e) {
    console.error("DB_ERROR:", e instanceof Error ? e.message : e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
