-- Migration: add_energy_settings
-- Skapar EnergySettings-tabell för nätavgift och elnätsinformation

CREATE TABLE "EnergySettings" (
    "id"                SERIAL          NOT NULL,
    "gridProvider"      TEXT            NOT NULL DEFAULT 'Sundsvalls Elnät',
    "gridFeePerKwh"     DOUBLE PRECISION NOT NULL DEFAULT 1.20,
    "fuse"              INTEGER         NOT NULL DEFAULT 20,
    "annualConsumption" INTEGER         NOT NULL DEFAULT 20000,
    "createdAt"         TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnergySettings_pkey" PRIMARY KEY ("id")
);

-- Lägg in standardvärden direkt (användarens konfiguration)
INSERT INTO "EnergySettings" ("gridProvider", "gridFeePerKwh", "fuse", "annualConsumption", "updatedAt")
VALUES ('Sundsvalls Elnät', 1.20, 20, 20000, CURRENT_TIMESTAMP);
