import { FastifyInstance } from "fastify";
import prisma from "../../shared/db";

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

    // Hämta aktuell förbrukning (senaste mätning)
    const currentReading = await prisma.energyLog.findFirst({
      where: deviceId ? { deviceId } : {},
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    // Beräkna totala förbrukningsmängder för olika tidsperioder
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Föregående KALENDERDYGN: från 00:00 till 23:59:59 igår
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    // Hämta loggar för alla tidsperioder
    const baseWhere = deviceId ? { deviceId } : {};

    const [oneHourLogs, twelveHourLogs, twentyFourHourLogs, previousDayLogs] = await Promise.all([
      prisma.energyLog.findMany({
        where: { ...baseWhere, createdAt: { gte: oneHourAgo } },
      }),
      prisma.energyLog.findMany({
        where: { ...baseWhere, createdAt: { gte: twelveHoursAgo } },
      }),
      prisma.energyLog.findMany({
        where: { ...baseWhere, createdAt: { gte: twentyFourHoursAgo } },
      }),
      prisma.energyLog.findMany({
        where: { ...baseWhere, createdAt: { gte: yesterday, lte: yesterdayEnd } },
      }),
    ]);

    // Beräkna totala förbrukningsmängder (Wh-ekvivalent genom att summera watts-värden och approximera tid)
    // Eftersom vi får värden var ~5:e minut, approximeras energi genom att ta genomsnittet × tidsperioden
    const calculateConsumption = (logs: any[], hoursSpan: number) => {
      if (logs.length === 0) return 0;
      const avgWatts = logs.reduce((acc, log) => acc + log.watts, 0) / logs.length;
      return Math.round(avgWatts * hoursSpan * 100) / 100; // Wh (watt-timmar)
    };

    return {
      deviceId: deviceId || "all",
      currentWatts: currentReading?.watts || 0,
      currentTime: currentReading?.createdAt || new Date(),
      consumption1h: calculateConsumption(oneHourLogs, 1),
      consumption12h: calculateConsumption(twelveHourLogs, 12),
      consumption24h: calculateConsumption(twentyFourHourLogs, 24),
      consumptionPreviousDay: calculateConsumption(previousDayLogs, 24),
    };
  });
}
