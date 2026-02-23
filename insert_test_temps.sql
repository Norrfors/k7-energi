-- Lägg till historisk temperaturdata för senaste 24 timmar
INSERT INTO "TemperatureLog" ("deviceId", "deviceName", "zone", "temperature", "createdAt")
SELECT 
  device_id,
  device_name,
  zone,
  temp,
  now() - INTERVAL '1 minute' * (rn)
FROM (
  SELECT 'temp-001' as device_id, 'k7 — ÖV Huvudsovrum' as device_name, 'Sovrum' as zone, 19.5 + (gseries * 0.05) as temp, gseries * 15 as rn FROM generate_series(0, 100, 1) gseries
  UNION ALL
  SELECT 'temp-002', 'k7 — ÖV Sovrum Norr', 'Sovrum', 17.0 + (gseries * 0.03) as temp, gseries * 15 FROM generate_series(0, 100, 1) gseries
  UNION ALL
  SELECT 'temp-003', 'Altherma Hotwatertank', 'Teknik', 47.0 + (gseries * 0.08) as temp, gseries * 15 FROM generate_series(0, 100, 1) gseries
  UNION ALL
  SELECT 'temp-004', 'k7 BV — Vardagsrum', 'Vardagsrum', 22.0 + (gseries * 0.02) as temp, gseries * 15 FROM generate_series(0, 100, 1) gseries
  UNION ALL
  SELECT 'temp-005', 'Outdoor Occupancy Sensor GARAGE', 'Garage', -6.5 + (gseries * 0.01) as temp, gseries * 15 FROM generate_series(0, 100, 1) gseries
) t;

SELECT COUNT(*) as total_temperature_records FROM "TemperatureLog";
SELECT deviceName, COUNT(*) as cnt, MIN(temperature) as min_temp, MAX(temperature) as max_temp, AVG(temperature) as avg_temp FROM "TemperatureLog" GROUP BY deviceName ORDER BY deviceName;
