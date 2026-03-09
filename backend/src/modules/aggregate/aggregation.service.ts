/**
 * Aggregeringstjänst – skapar dagliga sammanfattningar av rådata
 * och rensar gammal rådata (äldre än 45 dagar).
 *
 * Körs varje natt kl 01:00 via scheduler.
 * Kan även köras manuellt för backfill av historisk data.
 */

import prisma from '../../shared/db';
import { Logger } from '../../shared/logger';

const logger = new Logger('AggregationService');
const PULSE_ID = 'c2314e97-c95b-40d4-9393-dbc541d586d1';

// ─────────────────────────────────────────────
// Hjälpfunktioner
// ─────────────────────────────────────────────

function dayBounds(date: Date): { dayStart: Date; dayEnd: Date } {
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setUTCHours(23, 59, 59, 999);
  return { dayStart, dayEnd };
}

function dateOnly(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ─────────────────────────────────────────────
// Aggregering av elmätare (hela huset via Pulse)
// ─────────────────────────────────────────────

async function aggregateMeterDay(date: Date, dayStart: Date, dayEnd: Date): Promise<void> {
  // Föredra meterImported (direkt från Homey, exakt) framför meterValue (beräknat)
  const logs = await prisma.energyLog.findMany({
    where: {
      deviceId: PULSE_ID,
      createdAt: { gte: dayStart, lte: dayEnd },
      OR: [{ meterImported: { not: null } }, { meterValue: { not: null } }],
    },
    orderBy: { createdAt: 'asc' },
  });

  if (logs.length < 2) return; // Behöver minst start och slut

  const getMeter = (l: typeof logs[0]) => l.meterImported ?? l.meterValue ?? 0;
  const meterStart = getMeter(logs[0]);
  const meterEnd   = getMeter(logs[logs.length - 1]);
  const consumptionKwh = Math.max(0, meterEnd - meterStart);
  const avgWatts = logs.reduce((s, l) => s + l.watts, 0) / logs.length;
  const peakWatts = Math.max(...logs.map(l => l.watts));

  await prisma.dailyMeterAggregate.upsert({
    where: { date },
    update: { consumptionKwh, meterStart, meterEnd, avgWatts, peakWatts, updatedAt: new Date() },
    create: { date, consumptionKwh, meterStart, meterEnd, avgWatts, peakWatts },
  });

  logger.info(
    `Mätare ${date.toISOString().slice(0, 10)}: ${consumptionKwh.toFixed(2)} kWh ` +
    `(${meterStart.toFixed(0)}→${meterEnd.toFixed(0)}, peak ${peakWatts.toFixed(0)} W)`
  );
}

// ─────────────────────────────────────────────
// Aggregering av energi per enhet
// ─────────────────────────────────────────────

async function aggregateEnergyDay(date: Date, dayStart: Date, dayEnd: Date): Promise<void> {
  // Hämta alla unika enheter med energidata för dagen
  const devices = await prisma.energyLog.groupBy({
    by: ['deviceId', 'deviceName'],
    where: { createdAt: { gte: dayStart, lte: dayEnd } },
  });

  for (const device of devices) {
    const logs = await prisma.energyLog.findMany({
      where: { deviceId: device.deviceId, createdAt: { gte: dayStart, lte: dayEnd } },
      orderBy: { createdAt: 'asc' },
    });

    if (logs.length === 0) continue;

    // kWh = Σ(watts × Δt_min / 60 / 1000)
    let totalKwh = 0;
    for (let i = 1; i < logs.length; i++) {
      const dt = (logs[i].createdAt.getTime() - logs[i - 1].createdAt.getTime()) / (1000 * 60);
      totalKwh += (logs[i].watts * dt) / 60 / 1000;
    }

    const avgWatts = logs.reduce((s, l) => s + l.watts, 0) / logs.length;
    const peakWatts = Math.max(...logs.map(l => l.watts));
    const zone = logs[0].zone || null;

    await prisma.dailyEnergyAggregate.upsert({
      where: { date_deviceId: { date, deviceId: device.deviceId } },
      update: { totalKwh, avgWatts, peakWatts, zone, updatedAt: new Date() },
      create: { date, deviceId: device.deviceId, deviceName: device.deviceName, zone, totalKwh, avgWatts, peakWatts },
    });
  }
}

// ─────────────────────────────────────────────
// Aggregering av temperatur per sensor
// ─────────────────────────────────────────────

async function aggregateTemperatureDay(date: Date, dayStart: Date, dayEnd: Date): Promise<void> {
  const devices = await prisma.temperatureLog.groupBy({
    by: ['deviceId', 'deviceName'],
    where: { createdAt: { gte: dayStart, lte: dayEnd } },
  });

  for (const device of devices) {
    const logs = await prisma.temperatureLog.findMany({
      where: { deviceId: device.deviceId, createdAt: { gte: dayStart, lte: dayEnd } },
    });

    if (logs.length === 0) continue;

    const temps = logs.map(l => l.temperature);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const avgTemp = temps.reduce((s, t) => s + t, 0) / temps.length;
    const zone = logs[0].zone || null;

    await prisma.dailyTemperatureAggregate.upsert({
      where: { date_deviceId: { date, deviceId: device.deviceId } },
      update: { minTemp, maxTemp, avgTemp, readings: logs.length, zone, updatedAt: new Date() },
      create: { date, deviceId: device.deviceId, deviceName: device.deviceName, zone, minTemp, maxTemp, avgTemp, readings: logs.length },
    });
  }
}

// ─────────────────────────────────────────────
// Publika funktioner
// ─────────────────────────────────────────────

/**
 * Aggregerar rådata för ett givet datum till dagliga sammanfattningar.
 * Säker att köra om (upsert).
 */
export async function aggregateDay(date: Date): Promise<void> {
  const d = dateOnly(date);
  const { dayStart, dayEnd } = dayBounds(date);

  logger.info(`Aggregerar ${d.toISOString().slice(0, 10)}...`);
  await Promise.all([
    aggregateMeterDay(d, dayStart, dayEnd),
    aggregateEnergyDay(d, dayStart, dayEnd),
    aggregateTemperatureDay(d, dayStart, dayEnd),
  ]);
}

/**
 * Aggregerar igårets data – anropas av schemaläggaren kl 01:00.
 */
export async function aggregateYesterday(): Promise<void> {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  await aggregateDay(yesterday);
}

/**
 * Backfyllar aggregat för alla dagar som finns i rådata men saknar aggregat.
 * Anropas vid startup.
 */
export async function backfillAggregates(): Promise<void> {
  const firstLog = await prisma.energyLog.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!firstLog) return;

  const firstDate = dateOnly(firstLog.createdAt);
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayDate = dateOnly(yesterday);

  let current = new Date(firstDate);
  let count = 0;

  while (current <= yesterdayDate) {
    // Hoppa över om aggregat redan finns (för att inte onödigt beräkna om)
    const existing = await prisma.dailyMeterAggregate.findUnique({
      where: { date: dateOnly(current) },
    });
    if (!existing) {
      await aggregateDay(current);
      count++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  if (count > 0) {
    logger.info(`Backfill klar: ${count} dagar aggregerade`);
  }
}

/**
 * Tar bort rådata äldre än N dagar (default 45).
 * Körs EFTER aggregering för att säkerställa att data sparats.
 */
export async function pruneOldData(days: number = 45): Promise<void> {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);

  const [e, t, m, p] = await Promise.all([
    prisma.energyLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.temperatureLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.meterReading.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.priceLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
  ]);

  const total = e.count + t.count + m.count + p.count;
  if (total > 0) {
    logger.info(
      `Rensade ${total} råposter >45 dagar ` +
      `(EnergyLog:${e.count} TempLog:${t.count} MeterReading:${m.count} PriceLog:${p.count})`
    );
  }
}
