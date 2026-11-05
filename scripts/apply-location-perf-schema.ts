import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "last_latitude" DECIMAL(10,7)`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "last_longitude" DECIMAL(10,7)`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "last_accuracy" DECIMAL(10,2)`
  );
  console.log("devices columns ok");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "location_day_stats" (
      "device_id" TEXT NOT NULL,
      "day" DATE NOT NULL,
      "point_count" INTEGER NOT NULL,
      CONSTRAINT "location_day_stats_pkey" PRIMARY KEY ("device_id","day")
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "location_day_stats_device_id_day_idx"
      ON "location_day_stats"("device_id", "day" DESC);
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "location_day_stats"
        ADD CONSTRAINT "location_day_stats_device_id_fkey"
        FOREIGN KEY ("device_id") REFERENCES "devices"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  console.log("location_day_stats ok");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
