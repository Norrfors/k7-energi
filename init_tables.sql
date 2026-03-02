-- Init all database tables for v0.60

CREATE TABLE IF NOT EXISTS "TemperatureLog" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "zone" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EnergyLog" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "zone" TEXT,
    "watts" DOUBLE PRECISION NOT NULL,
    "meterPower" DOUBLE PRECISION,
    "meterValue" DOUBLE PRECISION,
    "accumulatedCost" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ExternalData" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "MeterReading" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL DEFAULT 'c2314e97-c95b-40d4-9393-dbc541d586d1',
    "deviceName" TEXT NOT NULL DEFAULT 'Pulse Krokgatan 7',
    "consumptionSinceMidnight" DOUBLE PRECISION NOT NULL,
    "consumptionSincePreviousReading" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalMeterValue" DOUBLE PRECISION NOT NULL,
    "costSinceMidnight" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "MeterCalibration" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL DEFAULT 'c2314e97-c95b-40d4-9393-dbc541d586d1',
    "calibrationValue" DOUBLE PRECISION NOT NULL,
    "calibrationDateTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MeterCalibration_deviceId_calibrationDateTime_key" UNIQUE("deviceId", "calibrationDateTime")
);

CREATE TABLE IF NOT EXISTS "BackupSettings" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "backupFolderPath" TEXT NOT NULL DEFAULT './backups',
    "enableAutoBackup" BOOLEAN NOT NULL DEFAULT false,
    "backupDay" TEXT NOT NULL DEFAULT 'Monday',
    "backupTime" TEXT NOT NULL DEFAULT '02:00',
    "lastBackupAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "SensorVisibility" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL UNIQUE,
    "deviceName" TEXT NOT NULL,
    "sensorType" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "zone" TEXT NOT NULL DEFAULT '',
    "capabilitiesToLog" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL PRIMARY KEY,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "TemperatureLog_deviceId_createdAt_idx" on "TemperatureLog"("deviceId", "createdAt");
CREATE INDEX IF NOT EXISTS "EnergyLog_deviceId_createdAt_idx" on "EnergyLog"("deviceId", "createdAt");
CREATE INDEX IF NOT EXISTS "ExternalData_source_fetchedAt_idx" on "ExternalData"("source", "fetchedAt");
CREATE INDEX IF NOT EXISTS "MeterReading_deviceId_createdAt_idx" on "MeterReading"("deviceId", "createdAt");
CREATE INDEX IF NOT EXISTS "MeterCalibration_deviceId_calibrationDateTime_idx" on "MeterCalibration"("deviceId", "calibrationDateTime");
CREATE INDEX IF NOT EXISTS "SensorVisibility_sensorType_isVisible_idx" on "SensorVisibility"("sensorType", "isVisible");

-- Log migration
INSERT INTO "_prisma_migrations"("id","checksum","finished_at","migration_name","logs","rolled_back_at","started_at","applied_steps_count") 
VALUES ('20260305_v060_initial_tables','hash_v060','2026-03-05 00:00:00.000','v0.60 initial tables','Tables created from init_tables.sql',NULL,'2026-03-05 00:00:00.000',1)
ON CONFLICT DO NOTHING;
