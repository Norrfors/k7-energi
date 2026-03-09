import "dotenv/config"; // Laddar .env-filen automatiskt
import Fastify from "fastify";
import cors from "@fastify/cors";
import { execSync } from "child_process";
import prisma from "./shared/db";
import { homeyRoutes } from "./modules/homey/homey.controller";
import { historyRoutes } from "./modules/history/history.controller";
import { meterRoutes } from "./modules/meter/meter.controller";
import { backupRoutes } from "./modules/backup/backup.controller";
import { startScheduler } from "./shared/scheduler";
import { homeyService } from "./modules/homey/homey.service";
import {
  getAllTemperatureSensors,
  getAllEnergySensors,
  updateSensorVisibility,
} from "./modules/settings/settings.service";
import { backfillAggregates } from "./modules/aggregate/aggregation.service";

// Debug: Visa Homey-konfiguration som laddades
console.log(`[App] HOMEY_ADDRESS från env: ${process.env.HOMEY_ADDRESS}`);
console.log(`[App] HOMEY_TOKEN exist: ${!!process.env.HOMEY_TOKEN}`);
console.log(`[App] DATABASE_URL exist: ${!!process.env.DATABASE_URL}`);

// ============================================
// Huvudfilen – här startar allt
// ============================================

const app = Fastify({
  logger: true, // Skriver ut alla requests i terminalen – bra under utveckling
});

async function runMigrations() {
  try {
    console.log("[App] Kör Prisma-migrationer...");
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("[App] ✅ Migrationer slutförda");
  } catch (error) {
    console.error("[App] ❌ Migration misslyckades:", error);
    process.exit(1);
  }
}

// Backfill: kopiera zoneId från Device-tabellen till befintliga logg-rader
// Körs vid startup, säker att köra om (uppdaterar bara NULL-rader)
async function backfillZoneIds() {
  try {
    const updated1 = await prisma.$executeRaw`
      UPDATE "TemperatureLog" tl
      SET "zoneId" = d."zoneId"
      FROM "Device" d
      WHERE tl."deviceId" = d."id"
        AND tl."zoneId" IS NULL
        AND d."zoneId" IS NOT NULL
    `;
    const updated2 = await prisma.$executeRaw`
      UPDATE "EnergyLog" el
      SET "zoneId" = d."zoneId"
      FROM "Device" d
      WHERE el."deviceId" = d."id"
        AND el."zoneId" IS NULL
        AND d."zoneId" IS NOT NULL
    `;
    if (Number(updated1) > 0 || Number(updated2) > 0) {
      console.log(`[App] ✅ Backfill zoneId: ${updated1} TemperatureLog + ${updated2} EnergyLog poster`);
    }
  } catch (e) {
    console.warn("[App] ⚠️ Backfill zoneId misslyckades:", e);
  }
}

async function start() {
  // Kör migrationer först innan allt annat
  await runMigrations();

  // Synka Homey-enheter till Device-tabellen och backfilla zoneId i befintliga loggar
  await homeyService.syncDevices().catch((e) =>
    console.warn("[App] ⚠️ syncDevices misslyckades vid startup (Homey nåbar?):", e)
  );
  await backfillZoneIds();

  // Backfilla dagliga aggregat för eventuellt saknade dagar (asynkront, blockerar inte startup)
  backfillAggregates().catch((e) =>
    console.warn("[App] ⚠️ Backfill aggregat misslyckades:", e)
  );

  // CORS – tillåter frontend (port 3000) att anropa backend (port 3001)
  // Utan detta blockerar webbläsaren anropen av säkerhetsskäl
  await app.register(cors, {
    origin: true, // Tillåter alla origins under utveckling
  });

  // Registrera routes (endpoints)
  await app.register(homeyRoutes);
  await app.register(historyRoutes);
  await app.register(meterRoutes);
  await app.register(backupRoutes);

  // Settings routes – inline (plugin-pattern didn't work)
  app.get("/api/settings/sensors/temperature", async (req, reply) => {
    const sensors = await getAllTemperatureSensors();
    reply.send(sensors);
  });

  app.get("/api/settings/sensors/energy", async (req, reply) => {
    const sensors = await getAllEnergySensors();
    reply.send(sensors);
  });

  app.put("/api/settings/sensors/:deviceId/visibility", async (req, reply) => {
    const { deviceId } = req.params as { deviceId: string };
    const { isVisible } = req.body as { isVisible: boolean };
    const updated = await updateSensorVisibility(deviceId, isVisible);
    reply.send(updated);
  });

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

  // TEST: Inline test-route för att verifiera plugin-issue
  app.get("/api/test/settings", async () => {
    return { message: "Inline settings test works!" };
  });

  // Elnätsinställningar – GET hämtar (eller skapar) inställningar, POST uppdaterar
  app.get("/api/settings/energy", async (req, reply) => {
    let settings = await prisma.energySettings.findFirst();
    if (!settings) {
      settings = await prisma.energySettings.create({ data: {} });
    }
    reply.send(settings);
  });

  app.post("/api/settings/energy", async (req, reply) => {
    const body = req.body as {
      gridProvider?: string;
      gridFeePerKwh?: number;
      fuse?: number;
      annualConsumption?: number;
    };
    let settings = await prisma.energySettings.findFirst();
    if (!settings) {
      settings = await prisma.energySettings.create({ data: body });
    } else {
      settings = await prisma.energySettings.update({
        where: { id: settings.id },
        data: body,
      });
    }
    reply.send(settings);
  });

  // Starta schemaläggaren (uppdaterar mätardata varje minut, loggar temp/energi var 5:e minut)
  startScheduler();

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
