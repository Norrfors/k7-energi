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
  // Returnerar energisammanfattning: aktuell + medelvärden för 1h/12h/24h
  app.get("/api/history/energy-summary", async (request) => {
    const { deviceId } = request.query as { deviceId?: string };

    // Hämta aktuell förbrukning (senaste mätning)
    const currentReading = await prisma.energyLog.findFirst({
      where: deviceId ? { deviceId } : {},
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    // Beräkna medelvärden för olika tidsperioder
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Hämta loggar för alla tidsperioder
    const baseWhere = deviceId ? { deviceId } : {};

    const [oneHourLogs, twelveHourLogs, twentyFourHourLogs] = await Promise.all([
      prisma.energyLog.findMany({
        where: { ...baseWhere, createdAt: { gte: oneHourAgo } },
      }),
      prisma.energyLog.findMany({
        where: { ...baseWhere, createdAt: { gte: twelveHoursAgo } },
      }),
      prisma.energyLog.findMany({
        where: { ...baseWhere, createdAt: { gte: twentyFourHoursAgo } },
      }),
    ]);

    // Beräkna medelvärden
    const calculateAverage = (logs: any[]) => {
      if (logs.length === 0) return 0;
      const sum = logs.reduce((acc, log) => acc + log.watts, 0);
      return Math.round((sum / logs.length) * 100) / 100; // Avrunda till 2 decimaler
    };

    return {
      deviceId: deviceId || "all",
      currentWatts: currentReading?.watts || 0,
      currentTime: currentReading?.createdAt || new Date(),
      averageWatts1h: calculateAverage(oneHourLogs),
      averageWatts12h: calculateAverage(twelveHourLogs),
      averageWatts24h: calculateAverage(twentyFourHourLogs),
      count1h: oneHourLogs.length,
      count12h: twelveHourLogs.length,
      count24h: twentyFourHourLogs.length,
    };
  });
}
