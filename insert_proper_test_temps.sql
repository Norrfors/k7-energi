-- Rensa gammal testdata
DELETE FROM "TemperatureLog";

-- Lägg till varierad historisk temperaturdata för alla Homey-enheter från senaste 24 timmar
-- Varje enhet får ~50 poster med långsamt varierande värden

INSERT INTO "TemperatureLog" ("deviceId", "deviceName", "zone", "temperature", "createdAt")
SELECT * FROM (
  -- k7 — ÖV Huvudsovrum (mellan 19-21°C)
  SELECT '0865a88c-80a2-4518-81e2-ee5851bb610c', 'k7 — ÖV Huvudsovrum', 'Sovrum', 
         20.5 + SIN(gseries * 0.1) * 1.2, now() - INTERVAL '1 minute' * (gseries * 30) 
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- k7 — ÖV Sovrum Norr (mellan 16-19°C)
  SELECT '131777fc-2bd3-4ff9-840d-3cf3c6ee76e9', 'k7 — ÖV Sovrum Norr', 'Sovrum',
         18.0 + SIN(gseries * 0.12) * 1.5, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- Altherma Hotwatertank (mellan 46-50°C)
  SELECT '139fe129-4e1b-4f04-be32-576f1fecbea6', 'Altherma Hotwatertank', 'Teknik',
         48.0 + SIN(gseries * 0.08) * 2, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- k7 BV  — Vardagsrum (mellan 22-24°C - notera två mellanslag!)
  SELECT '15b96a44-082c-4283-8620-bfd352c535b6', 'k7 BV  — Vardagsrum', 'Vardagsrum',
         23.0 + SIN(gseries * 0.1) * 0.8, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- Outdoor Occupancy Sensor GARAGE (mellan -7 till -6°C)
  SELECT '17726655-5548-47c1-96b5-fec3254f3591', 'Outdoor Occupancy Sensor GARAGE', 'Garage',
         -6.5 + SIN(gseries * 0.15) * 0.6, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- T01 (mellan 21-24°C)
  SELECT '287d7c9c-09cf-4c88-beea-828445c364e7', 'T01', 'Okänd',
         22.6 + SIN(gseries * 0.09) * 1.2, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- Namron Multisensor 4512734
  SELECT '2d6cf145-b2fd-4b19-a5c1-4b44904f6e3c', 'Namron Multisensor 4512734', 'Okänd',
         23.3 + SIN(gseries * 0.11) * 1, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- k7 (K7-INNE) — K7-INNE
  SELECT '3487c09c-f725-4601-8cd8-c2cd2b38a94d', 'k7 (K7-INNE) — K7-INNE', 'Okänd',
         22.1 + SIN(gseries * 0.1) * 1.5, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- k7 — ÖV Sovrum Syd
  SELECT '34d7ca28-7334-4c79-81ad-7711bef6d1fc', 'k7 — ÖV Sovrum Syd', 'Sovrum',
         22.0 + SIN(gseries * 0.14) * 1.3, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- WH2 kanske skyddsrum eller garage
  SELECT '37b67139-5bf1-48ba-82ab-68856fcb6d8e', 'WH2 kanske skyddsrum eller garage', 'Okänd',
         -7.0 + SIN(gseries * 0.2) * 1, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- WH2 Inne Gatuplan
  SELECT '46174c80-cc02-45b2-aac4-7f5c2ce8a810', 'WH2 Inne Gatuplan', 'Okänd',
         22.6 + SIN(gseries * 0.13) * 1.1, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- k7 — BV Hall
  SELECT '6b2997f5-ae40-4208-8fe5-40b0bfeba372', 'k7 — BV Hall', 'Hall',
         23.5 + SIN(gseries * 0.1) * 0.9, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- Outdoor Occupancy Sensor HUVUDENTRE
  SELECT '75306cba-0b1d-4524-bb2f-38963ba3768e', 'Outdoor Occupancy Sensor HUVUDENTRE', 'Entrée',
         -6.8 + SIN(gseries * 0.18) * 0.7, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- WH2 UTE Norr Inglas
  SELECT '7fae4d7c-0ded-4602-91b9-8510c8134d32', 'WH2 UTE Norr Inglas ', 'Ute',
         22.6 + SIN(gseries * 0.12) * 1.4, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- k7 — ÖV Hall
  SELECT '8c82ffcd-5465-48ce-9e6d-6ebc81e3c3c2', 'k7 — ÖV Hall', 'Hall',
         23.0 + SIN(gseries * 0.11) * 1, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- Oregon INNE
  SELECT '97724d41-dea8-4a2b-901c-b00489ca492a', 'Oregon INNE', 'Okänd',
         23.2 + SIN(gseries * 0.09) * 1.2, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- WH2 ÖV  xx IN
  SELECT '9cc3b5f3-3fb0-4694-9b3c-bb3772480302', 'WH2 ÖV  xx IN', 'Okänd',
         22.6 + SIN(gseries * 0.1) * 1.3, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- Oregon Temp THGN800
  SELECT 'a9150bb8-da7d-4ebe-86cd-e4235ae88454', 'Oregon Temp THGN800', 'Ute',
         -7.1 + SIN(gseries * 0.16) * 0.8, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- k7 — BV Matsal
  SELECT 'b7fb10c0-236d-42d0-9e69-b6399828c56c', 'k7 — BV Matsal', 'Matsal',
         22.0 + SIN(gseries * 0.12) * 1.1, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- k7 (K7-INNE) — K7-UTE
  SELECT 'c52596c5-a06c-45cc-9e79-997082825629', 'k7 (K7-INNE) — K7-UTE', 'Ute',
         -15.0 + SIN(gseries * 0.2) * 5, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- WH2 x OUT
  SELECT 'cc71ac4f-f444-4444-b176-9fbcc42ce6b7', 'WH2 x OUT', 'Ute',
         1.8 + SIN(gseries * 0.15) * 2, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- WH2 ny  UTE Telldus
  SELECT 'd2784fd7-d368-4d43-9f54-f84d6ea68616', 'WH2 ny  UTE Telldus ', 'Ute',
         21.4 + SIN(gseries * 0.14) * 1.8, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- WH2 ÖV UTE
  SELECT 'dc018790-a765-4ee1-8d89-c7f718b02d31', 'WH2 ÖV UTE ', 'Ute',
         24.3 + SIN(gseries * 0.1) * 1.5, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- ÖV Badrum termostat
  SELECT 'f04a901e-0c1f-484b-bfa8-cdee5875b806', 'ÖV Badrum termostat  4512744/45', 'Badrum',
         17.7 + SIN(gseries * 0.13) * 1.2, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- k7 — ÖV Kontor
  SELECT 'f2e30e2b-b1ca-4fb8-8163-4e50d4039ae9', 'k7 — ÖV Kontor', 'Kontor',
         21.5 + SIN(gseries * 0.11) * 1.4, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
  UNION ALL
  -- WH2 -- kanske garage el skyddsrum
  SELECT 'f817cf23-33b5-436b-b8d1-3ab431cf31bc', 'WH2 -- kanske garage el skyddsrum', 'Garage',
         -8.2 + SIN(gseries * 0.17) * 1.1, now() - INTERVAL '1 minute' * (gseries * 30)
  FROM generate_series(0, 48) gseries
) data;

SELECT COUNT(*) as total_records FROM "TemperatureLog";
SELECT "deviceName", COUNT(*) as cnt, 
       ROUND(MIN("temperature")::numeric, 1) as min_temp,
       ROUND(MAX("temperature")::numeric, 1) as max_temp,
       ROUND(AVG("temperature")::numeric, 1) as avg_temp
FROM "TemperatureLog" 
GROUP BY "deviceName" 
ORDER BY "deviceName";
