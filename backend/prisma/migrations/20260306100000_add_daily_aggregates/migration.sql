-- Migration: add_daily_aggregates
-- Skapar tre tabeller för dagliga aggregat av mätare, energi och temperatur.
-- Rådata rensas efter 45 dagar – aggregaten sparas för alltid.

CREATE TABLE "DailyMeterAggregate" (
    "id"             SERIAL           NOT NULL,
    "date"           DATE             NOT NULL,
    "consumptionKwh" DOUBLE PRECISION NOT NULL,
    "meterStart"     DOUBLE PRECISION NOT NULL,
    "meterEnd"       DOUBLE PRECISION NOT NULL,
    "avgWatts"       DOUBLE PRECISION NOT NULL,
    "peakWatts"      DOUBLE PRECISION NOT NULL,
    "createdAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyMeterAggregate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DailyMeterAggregate_date_key" ON "DailyMeterAggregate"("date");

CREATE TABLE "DailyEnergyAggregate" (
    "id"         SERIAL           NOT NULL,
    "date"       DATE             NOT NULL,
    "deviceId"   TEXT             NOT NULL,
    "deviceName" TEXT             NOT NULL,
    "zone"       TEXT,
    "totalKwh"   DOUBLE PRECISION NOT NULL,
    "avgWatts"   DOUBLE PRECISION NOT NULL,
    "peakWatts"  DOUBLE PRECISION NOT NULL,
    "createdAt"  TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyEnergyAggregate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DailyEnergyAggregate_date_deviceId_key" ON "DailyEnergyAggregate"("date", "deviceId");
CREATE INDEX "DailyEnergyAggregate_date_idx" ON "DailyEnergyAggregate"("date");

CREATE TABLE "DailyTemperatureAggregate" (
    "id"         SERIAL           NOT NULL,
    "date"       DATE             NOT NULL,
    "deviceId"   TEXT             NOT NULL,
    "deviceName" TEXT             NOT NULL,
    "zone"       TEXT,
    "minTemp"    DOUBLE PRECISION NOT NULL,
    "maxTemp"    DOUBLE PRECISION NOT NULL,
    "avgTemp"    DOUBLE PRECISION NOT NULL,
    "readings"   INTEGER          NOT NULL,
    "createdAt"  TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyTemperatureAggregate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DailyTemperatureAggregate_date_deviceId_key" ON "DailyTemperatureAggregate"("date", "deviceId");
CREATE INDEX "DailyTemperatureAggregate_date_idx" ON "DailyTemperatureAggregate"("date");
