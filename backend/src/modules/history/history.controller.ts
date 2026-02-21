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
}
