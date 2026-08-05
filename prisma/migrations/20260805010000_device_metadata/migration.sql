-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "make" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "os_version" TEXT,
ADD COLUMN     "connection_status" TEXT,
ADD COLUMN     "battery_percent" INTEGER,
ADD COLUMN     "battery_charging" BOOLEAN,
ADD COLUMN     "battery_health" TEXT,
ADD COLUMN     "phone_no" TEXT,
ADD COLUMN     "sim_network" TEXT,
ADD COLUMN     "sf_group_name" TEXT,
ADD COLUMN     "license_active" BOOLEAN,
ADD COLUMN     "license_expires_at" TIMESTAMP(3),
ADD COLUMN     "details_fetched_at" TIMESTAMP(3);
