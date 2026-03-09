import { FastifyInstance } from "fastify";
import prisma from "../../shared/db";
import { homeyService } from "../homey/homey.service";

// Historik-endpoints – hämtar sparad data från databasen

export async function historyRoutes(app: FastifyInstance) {
  // GET /api/history/temperatures?hours=24
  // Hämtar temperaturlogg för de senaste N timmarna
  app.get("/api/history/temperatures", async (request) => {
    const { hours = "24" } = request.query as { hours?: string };
    const since = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);

    const logs = await prisma.temperatureLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
    });

    return logs;
  });

  // GET /api/history/energy?hours=24
  app.get("/api/history/energy", async (request) => {
    const { hours = "24" } = request.query as { hours?: string };
    const since = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);

    const logs = await prisma.energyLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
    });

    return logs;
  });

  // GET /api/history/energy-summary
  // Returnerar energisammanfattning: aktuell + totala förbrukningsmängder för 1h/12h/24h/föregäendedygn
  app.get("/api/history/energy-summary", async (request) => {
    const { deviceId } = request.query as { deviceId?: string };

    // Hämta senaste mätning - om det är "all" måste vi söka efter Pulse specifikt
    let currentReading;
    if (deviceId) {
      currentReading = await prisma.energyLog.findFirst({
        where: { deviceId },
        orderBy: { createdAt: "desc" },
        take: 1,
      });
    } else {
      // För "all" - söka efter Pulse (den riktiga energisensorn)
      currentReading = await prisma.energyLog.findFirst({
        where: { deviceName: { contains: "Pulse" } },
        orderBy: { createdAt: "desc" },
        take: 1,
      });
    }

    // Alla perioder för delta-beräkning via meterImported (max - min = exakt förbrukning)
    const now = new Date();

    // Dagens start (lokal tid midnatt)
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Föregående kalenderdygn
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const baseWhere = deviceId
      ? { deviceId }
      : { deviceName: { contains: "Pulse" } };

    // Hämta endast meterImported-kolumnen för alla perioder parallellt
    const [logs1h, logs12h, logs24h, logsToday, logsYesterday] = await Promise.all([
      prisma.energyLog.findMany({ where: { ...baseWhere, meterImported: { not: null }, createdAt: { gte: new Date(now.getTime() - 3600_000) } }, select: { meterImported: true } }),
      prisma.energyLog.findMany({ where: { ...baseWhere, meterImported: { not: null }, createdAt: { gte: new Date(now.getTime() - 43200_000) } }, select: { meterImported: true } }),
      prisma.energyLog.findMany({ where: { ...baseWhere, meterImported: { not: null }, createdAt: { gte: new Date(now.getTime() - 86400_000) } }, select: { meterImported: true } }),
      prisma.energyLog.findMany({ where: { ...baseWhere, meterImported: { not: null }, createdAt: { gte: todayStart } }, select: { meterImported: true } }),
      prisma.energyLog.findMany({ where: { ...baseWhere, meterImported: { not: null }, createdAt: { gte: yesterday, lte: yesterdayEnd } }, select: { meterImported: true } }),
    ]);

    // Delta = max - min av meterImported inom perioden (Wh-konverterat × 1000)
    const deltaWh = (logs: { meterImported: number | null }[]) => {
      const vals = logs.map(l => l.meterImported!).filter(v => v > 0);
      if (vals.length < 2) return 0;
      return Math.round((Math.max(...vals) - Math.min(...vals)) * 1000 * 100) / 100;
    };

    return {
      deviceId: deviceId || "all",
      currentWatts: currentReading?.watts || 0,
      currentTime: currentReading?.createdAt || new Date(),
      totalMeterValue: currentReading?.meterImported ?? null,
      consumption1h: deltaWh(logs1h),
      consumption12h: deltaWh(logs12h),
      consumption24h: deltaWh(logs24h),
      consumptionToday: deltaWh(logsToday),
      consumptionPreviousDay: deltaWh(logsYesterday),
    };
  });

  // ─────────────────────────────────────────
  // Aggregerade historik-endpoints
  // ─────────────────────────────────────────

  // GET /api/aggregate/daily-meter?days=30
  // Daglig mätardata (hela huset) – senaste N dagar
  app.get("/api/aggregate/daily-meter", async (request) => {
    const { days = "30" } = request.query as { days?: string };
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - parseInt(days));
    since.setUTCHours(0, 0, 0, 0);

    return prisma.dailyMeterAggregate.findMany({
      where: { date: { gte: since } },
      orderBy: { date: "asc" },
    });
  });

  // GET /api/aggregate/weekly-meter?weeks=12
  // Veckovis förbrukning – beräknas från dagliga aggregat
  app.get("/api/aggregate/weekly-meter", async (request) => {
    const { weeks = "12" } = request.query as { weeks?: string };
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - parseInt(weeks) * 7);

    const rows = await prisma.$queryRaw<
      Array<{ year: number; week: number; consumptionKwh: number; avgWatts: number; peakWatts: number }>
    >`
      SELECT
        EXTRACT(ISOYEAR FROM date)::int AS year,
        EXTRACT(WEEK FROM date)::int    AS week,
        SUM("consumptionKwh")           AS "consumptionKwh",
        AVG("avgWatts")                 AS "avgWatts",
        MAX("peakWatts")                AS "peakWatts"
      FROM "DailyMeterAggregate"
      WHERE date >= ${since}
      GROUP BY year, week
      ORDER BY year, week
    `;
    return rows;
  });

  // GET /api/aggregate/monthly-meter?months=24
  // Månadsvis förbrukning – beräknas från dagliga aggregat
  app.get("/api/aggregate/monthly-meter", async (request) => {
    const { months = "24" } = request.query as { months?: string };
    const since = new Date();
    since.setUTCMonth(since.getUTCMonth() - parseInt(months));

    const rows = await prisma.$queryRaw<
      Array<{ year: number; month: number; consumptionKwh: number; avgWatts: number; peakWatts: number }>
    >`
      SELECT
        EXTRACT(YEAR FROM date)::int  AS year,
        EXTRACT(MONTH FROM date)::int AS month,
        SUM("consumptionKwh")         AS "consumptionKwh",
        AVG("avgWatts")               AS "avgWatts",
        MAX("peakWatts")              AS "peakWatts"
      FROM "DailyMeterAggregate"
      WHERE date >= ${since}
      GROUP BY year, month
      ORDER BY year, month
    `;
    return rows;
  });

  // GET /api/aggregate/daily-temperatures?days=30
  // Daglig temperatursammanfattning per sensor
  app.get("/api/aggregate/daily-temperatures", async (request) => {
    const { days = "30" } = request.query as { days?: string };
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - parseInt(days));
    since.setUTCHours(0, 0, 0, 0);

    return prisma.dailyTemperatureAggregate.findMany({
      where: { date: { gte: since } },
      orderBy: [{ date: "asc" }, { deviceName: "asc" }],
    });
  });

  // GET /api/sensor/:deviceId/capabilities
  // Hämta vilka capabilities en sensor har och vilka som är inställda att loggas
  app.get<{ Params: { deviceId: string } }>(
    "/api/sensor/:deviceId/capabilities",
    async (request) => {
      const { deviceId } = request.params;

      // Hämta sensor-inställningar från databasen
      const settings = await prisma.sensorVisibility.findUnique({
        where: { deviceId },
      });

      if (!settings) {
        return {
          error: "Sensorn hittades inte",
          deviceId,
        };
      }

      // Parse capabilitiesToLog från JSON
      let capabilitiesToLog: string[] = [];
      try {
        capabilitiesToLog = JSON.parse(
          JSON.stringify(settings.capabilitiesToLog)
        ) as string[];
      } catch {
        capabilitiesToLog = [];
      }

      // Hämta faktiska capabilities från Homey enhet
      const actualCapabilities = await homeyService.getDeviceCapabilities(deviceId);

      return {
        deviceId,
        deviceName: settings.deviceName,
        sensorType: settings.sensorType,
        capabilitiesToLog,
        // Visa alla möjliga capabilities från Homey (eller fallback till defaults om Homey är nere)
        availableCapabilities:
          actualCapabilities.length > 0
            ? actualCapabilities
            : (settings.sensorType === "energy"
                ? [
                    "measure_power",
                    "meter_power",
                    "meter_value",
                    "accumulatedCost",
                  ]
                : [
                    "measure_temperature",
                    "outdoorTemperature",
                    "measure_humidity",
                  ]),
      };
    }
  );

  // PUT /api/sensor/:deviceId/capabilities
  // Uppdatera vilka capabilities som ska loggas för en sensor
  app.put<{
    Params: { deviceId: string };
    Body: { capabilitiesToLog: string[] };
  }>("/api/sensor/:deviceId/capabilities", async (request, reply) => {
    const { deviceId } = request.params;
    const { capabilitiesToLog } = request.body;

    if (!Array.isArray(capabilitiesToLog)) {
      reply.status(400);
      return { error: "capabilitiesToLog måste vara en array" };
    }

    try {
      // Uppdatera databasen
      const updated = await prisma.sensorVisibility.update({
        where: { deviceId },
        data: {
          capabilitiesToLog: capabilitiesToLog, // Prisma hanterar JSON automatiskt
        },
      });

      return {
        success: true,
        deviceId,
        capabilitiesToLog,
        message: `Loggning uppdaterad för ${updated.deviceName}`,
      };
    } catch (error) {
      reply.status(500);
      return {
        error: "Kunde inte uppdatera capabilities",
        details: String(error),
      };
    }
  });
}

