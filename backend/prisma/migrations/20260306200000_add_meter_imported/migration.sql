-- Lägg till meterImported i EnergyLog
-- meter_power.imported från Homey Pulse = kumulativ total import (kWh)
-- Detta är den exakta absoluta mätarställningen utan beräkning
ALTER TABLE "EnergyLog" ADD COLUMN "meterImported" DOUBLE PRECISION;
