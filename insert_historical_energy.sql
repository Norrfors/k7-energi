-- Generera historisk energidata för de senaste 6 dagarna
-- Varje dag får ~200 datapunkter för varje energienhet

-- Rensa först gamla data (behåll idag)
DELETE FROM "EnergyLog" WHERE "createdAt" < '2026-02-22T00:00:00Z';

-- Lägg till historisk energidata
INSERT INTO "EnergyLog" ("deviceId", "deviceName", "zone", "watts", "meterPower", "createdAt")
SELECT * FROM (
  -- Pulse (huvudenergienhet) - 2500-5000W variabel förbrukning
  SELECT 
    'c2314e97-c95b-40d4-9393-dbc541d586d1'::text as device_id,
    'Pulse'::text as device_name, 
    'Huvudpanel'::text as zone,
    (2500.0 + 1500.0 * SIN(EXTRACT(EPOCH FROM (now() - INTERVAL '1 minute' * (d * 1440 + m))) / 3600))::numeric as watts,
    (45000.0 + EXTRACT(DAY FROM (now() - INTERVAL '1 day' * d)) * 20000 + m * 100)::numeric as meter,
    (now() - INTERVAL '1 day' * d - INTERVAL '1 minute' * m)::timestamp as ts
  FROM generate_series(0, 5) d,
       generate_series(0, 1439, 7) m -- 7 minute intervals = ~205 points per day
  UNION ALL
  -- Altherma Värmepump (variabel enligt värmebehov)
  SELECT 
    '3aa90f10-0f9b-486d-8e19-c68eb6d6a7c3'::text,
    'Altherma — Värmepump'::text,
    'Värmepump'::text,
    (800.0 + 600.0 * SIN(EXTRACT(EPOCH FROM (now() - INTERVAL '1 minute' * (d * 1440 + m))) / 7200))::numeric,
    (8000.0 + EXTRACT(DAY FROM (now() - INTERVAL '1 day' * d)) * 15000 + m * 50)::numeric,
    (now() - INTERVAL '1 day' * d - INTERVAL '1 minute' * m)::timestamp
  FROM generate_series(0, 5) d,
       generate_series(0, 1439, 7) m
  UNION ALL
  -- Varmvattenberedare
  SELECT
    '5a5e2222-ce36-4d10-b48b-27095a2eb87f'::text,
    'Varmvattenberedare'::text,
    'Varmvatten'::text,
    (100.0 + 400.0 * SIN(EXTRACT(EPOCH FROM (now() - INTERVAL '1 minute' * (d * 1440 + m))) / 14400))::numeric,
    (1000.0 + EXTRACT(DAY FROM (now() - INTERVAL '1 day' * d)) * 5000 + m * 20)::numeric,
    (now() - INTERVAL '1 day' * d - INTERVAL '1 minute' * m)::timestamp
  FROM generate_series(0, 5) d,
       generate_series(0, 1439, 7) m
  UNION ALL
  -- Fläktsystem
  SELECT
    '7b2c1234-5678-4eff-8123-456789abcdef'::text,
    'Fläktsystem FTX'::text,
    'Ventilation'::text,
    (150.0 + 100.0 * SIN(EXTRACT(EPOCH FROM (now() - INTERVAL '1 minute' * (d * 1440 + m))) / 28800))::numeric,
    (2000.0 + EXTRACT(DAY FROM (now() - INTERVAL '1 day' * d)) * 3000 + m * 15)::numeric,
    (now() - INTERVAL '1 day' * d - INTERVAL '1 minute' * m)::timestamp
  FROM generate_series(0, 5) d,
       generate_series(0, 1439, 7) m
) data
WHERE data.ts >= '2026-02-22T00:00:00Z' AND data.ts <= now()
ORDER BY data.ts DESC;

SELECT COUNT(*) as inserted_rows FROM "EnergyLog";
SELECT MIN("createdAt") as oldest, MAX("createdAt") as newest FROM "EnergyLog";
