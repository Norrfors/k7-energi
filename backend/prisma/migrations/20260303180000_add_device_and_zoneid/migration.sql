-- Migration: add_device_and_zoneid
-- Skapar Device-tabell och lägger till zoneId i EnergyLog och TemperatureLog

-- Device-tabell: live-karta över alla Homey-enheter
-- Upsertas varje poll-cykel så namn och zon alltid är aktuella
CREATE TABLE "Device" (
    "id"        TEXT         NOT NULL,   -- Homey UUID (aldrig ändras)
    "name"      TEXT         NOT NULL,   -- Aktuellt enhetsnamn
    "zoneId"    TEXT,                    -- Homey zon-UUID
    "zoneName"  TEXT,                    -- Direkt zonnamn (t.ex. "Altan norr")
    "zonePath"  TEXT,                    -- Full stig (t.ex. "Hem / BV / Altan norr")
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- Lägg till zoneId i TemperatureLog (stabil UUID-referens vid sidan av zone-snapshot)
ALTER TABLE "TemperatureLog" ADD COLUMN "zoneId" TEXT;

-- Lägg till zoneId i EnergyLog
ALTER TABLE "EnergyLog" ADD COLUMN "zoneId" TEXT;
