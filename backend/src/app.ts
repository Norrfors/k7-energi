import "dotenv/config"; // Laddar .env-filen automatiskt
import Fastify from "fastify";
import cors from "@fastify/cors";
import prisma from "./shared/db";
import { homeyRoutes } from "./modules/homey/homey.controller";
import { historyRoutes } from "./modules/history/history.controller";
import { startScheduler } from "./shared/scheduler";

// ============================================
// Huvudfilen – här startar allt
// ============================================

const app = Fastify({
  logger: true, // Skriver ut alla requests i terminalen – bra under utveckling
});

async function start() {
  // CORS – tillåter frontend (port 3000) att anropa backend (port 3001)
  // Utan detta blockerar webbläsaren anropen av säkerhetsskäl
  await app.register(cors, {
    origin: "http://localhost:3000",
  });

  // Registrera routes (endpoints)
  await app.register(homeyRoutes);
  await app.register(historyRoutes);

  // Health check – enkel endpoint för att testa att allt kör
  app.get("/api/health", async () => {
    let dbStatus = "okänd";
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = "ansluten";
    } catch {
      dbStatus = "ej ansluten";
    }

    return {
      status: "ok",
      time: new Date().toISOString(),
      database: dbStatus,
    };
  });

  // Starta schemaläggaren (loggar data var 5:e minut)
  // Kommentera bort denna rad om du inte har Homey konfigurerad ännu
  // startScheduler();

  // Starta servern
  const port = parseInt(process.env.PORT || "3001");
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`\n🚀 Backend kör på http://localhost:${port}`);
  console.log(`   Testa: http://localhost:${port}/api/health\n`);
}

start().catch((err) => {
  console.error("Kunde inte starta servern:", err);
  process.exit(1);
});
