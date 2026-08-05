-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VIEWER');
CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'FAILURE');
CREATE TYPE "SyncType" AS ENUM ('DEVICE_SYNC', 'LOCATION_POLL', 'HISTORY_BACKFILL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "scalefusion_device_id" BIGINT NOT NULL,
    "device_name" TEXT NOT NULL,
    "employee_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "group_devices" (
    "group_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,

    CONSTRAINT "group_devices_pkey" PRIMARY KEY ("group_id","device_id")
);

CREATE TABLE "user_group_access" (
    "user_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,

    CONSTRAINT "user_group_access_pkey" PRIMARY KEY ("user_id","group_id")
);

CREATE TABLE "location_records" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "accuracy" DECIMAL(10,2),
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "sync_type" "SyncType" NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "records_added" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "employee_groups_name_key" ON "employee_groups"("name");
CREATE UNIQUE INDEX "devices_scalefusion_device_id_key" ON "devices"("scalefusion_device_id");
CREATE INDEX "location_records_device_id_recorded_at_idx" ON "location_records"("device_id", "recorded_at" DESC);
CREATE UNIQUE INDEX "location_records_device_id_recorded_at_latitude_longitude_key" ON "location_records"("device_id", "recorded_at", "latitude", "longitude");
CREATE INDEX "sync_logs_created_at_idx" ON "sync_logs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "group_devices" ADD CONSTRAINT "group_devices_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "employee_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_devices" ADD CONSTRAINT "group_devices_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_group_access" ADD CONSTRAINT "user_group_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_group_access" ADD CONSTRAINT "user_group_access_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "employee_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "location_records" ADD CONSTRAINT "location_records_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
