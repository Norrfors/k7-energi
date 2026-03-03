-- Migration: add_price_log
-- Skapar PriceLog-tabell för elpriser från Tibber via Homey

CREATE TABLE "PriceLog" (
    "id"           SERIAL       NOT NULL,
    "deviceId"     TEXT         NOT NULL,
    "deviceName"   TEXT         NOT NULL,
    "zoneId"       TEXT,
    "priceTotal"   DOUBLE PRECISION,       -- Aktuellt elpris SEK/kWh
    "priceLevel"   TEXT,                   -- CHEAP, NORMAL, EXPENSIVE, VERY_EXPENSIVE
    "priceLowest"  DOUBLE PRECISION,       -- Dagens lägsta pris SEK/kWh
    "priceHighest" DOUBLE PRECISION,       -- Dagens högsta pris SEK/kWh
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PriceLog_deviceId_createdAt_idx" ON "PriceLog"("deviceId", "createdAt");
