// Meter controller – API-endpoints för mätardata

import { FastifyInstance } from "fastify";
import { meterService } from "./meter.service";
import { Logger } from "../../shared/logger";

const logger = new Logger("MeterController");

export async function meterRoutes(app: FastifyInstance) {
  // GET /api/meter/latest – hämta senaste mätardata
  app.get("/api/meter/latest", async (request, reply) => {
    try {
      logger.info("Hämtar senaste mätardata");
      const reading = await meterService.getLatestMeterReading();

      if (!reading) {
        logger.warn("Ingen mätardata hittades");
        return { message: "Ingen data ännu" };
      }

      return {
        consumptionSinceMidnight: reading.consumptionSinceMidnight,
        consumptionSincePreviousReading: reading.consumptionSincePreviousReading,
        totalMeterValue: reading.totalMeterValue,
        lastUpdated: reading.createdAt,
      };
    } catch (error) {
      logger.error("Fel vid hämtning av senaste mätardata", error);
      reply.status(503);
      return { error: "Kunde inte hämta mätardata" };
    }
  });

  // GET /api/meter/today – hämta mätardata för idag
  app.get("/api/meter/today", async (request, reply) => {
    try {
      logger.info("Hämtar mätardata för idag");
      const readings = await meterService.getMeterReadingsSinceToday();

      return readings.map((r) => ({
        consumptionSinceMidnight: r.consumptionSinceMidnight,
        consumptionSincePreviousReading: r.consumptionSincePreviousReading,
        totalMeterValue: r.totalMeterValue,
        time: r.createdAt,
      }));
    } catch (error) {
      logger.error("Fel vid hämtning av dagens mätardata", error);
      reply.status(503);
      return { error: "Kunde inte hämta daglig mätardata" };
    }
  });

  // GET /api/meter/last24h – hämta mätardata senaste 24 timmar
  app.get("/api/meter/last24h", async (request, reply) => {
    try {
      logger.info("Hämtar mätardata för senaste 24 timmar");
      const readings = await meterService.getMeterReadingsLast24Hours();

      return readings.map((r) => ({
        consumptionSinceMidnight: r.consumptionSinceMidnight,
        consumptionSincePreviousReading: r.consumptionSincePreviousReading,
        totalMeterValue: r.totalMeterValue,
        time: r.createdAt,
      }));
    } catch (error) {
      logger.error("Fel vid hämtning av 24h mätardata", error);
      reply.status(503);
      return { error: "Kunde inte hämta 24h mätardata" };
    }
  });

  // POST /api/meter/set-manual – sätt mätarställning manuellt
  app.post<{
    Body: { totalMeterValue: number };
  }>("/api/meter/set-manual", async (request, reply) => {
    try {
      const { totalMeterValue } = request.body;

      if (typeof totalMeterValue !== "number" || totalMeterValue < 0) {
        logger.warn("Ogiltig mätarställningsvärde", totalMeterValue);
        reply.status(400);
        return { error: "Ogiltigt mätarvärde" };
      }

      logger.info(`Sätter manuell mätarställning: ${totalMeterValue}`);
      const result = await meterService.setManualMeterValue(totalMeterValue);

      return { success: true, reading: result };
    } catch (error) {
      logger.error("Fel vid inställning av manuell mätarställning", error);
      reply.status(503);
      return { error: "Kunde inte spara mätarställning" };
    }
  });
}
