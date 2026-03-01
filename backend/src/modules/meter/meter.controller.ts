// Meter controller – API-endpoints för mätardata

import { FastifyInstance } from "fastify";
import { meterService } from "./meter.service";
import { calibrateMeterReading, getCalibrationHistory } from "./meter.calibration";
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
        costSinceMidnight: reading.costSinceMidnight,
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

      return readings.map((r: any) => ({
        consumptionSinceMidnight: r.consumptionSinceMidnight,
        consumptionSincePreviousReading: r.consumptionSincePreviousReading,
        totalMeterValue: r.totalMeterValue,
        costSinceMidnight: r.costSinceMidnight,
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

      return readings.map((r: any) => ({
        consumptionSinceMidnight: r.consumptionSinceMidnight,
        consumptionSincePreviousReading: r.consumptionSincePreviousReading,
        totalMeterValue: r.totalMeterValue,
        costSinceMidnight: r.costSinceMidnight,
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

  // POST /api/meter/calibrate – kalibrering med manuell avläsning
  app.post<{
    Body: { calibrationValue: number; calibrationDateTime: string };
  }>("/api/meter/calibrate", async (request, reply) => {
    try {
      const { calibrationValue, calibrationDateTime } = request.body;

      if (typeof calibrationValue !== "number" || calibrationValue < 0) {
        logger.warn("Ogiltig kalibreringsvärde", calibrationValue);
        reply.status(400);
        return { error: "Ogiltigt kalibreringsvärde" };
      }

      if (!calibrationDateTime) {
        logger.warn("Kalibreringsdatum saknas");
        reply.status(400);
        return { error: "Kalibreringsdatum krävs" };
      }

      const calibDate = new Date(calibrationDateTime);
      if (isNaN(calibDate.getTime())) {
        logger.warn("Ogiltigt datumformat", calibrationDateTime);
        reply.status(400);
        return { error: "Ogiltigt datumformat" };
      }

      logger.info(
        `🔧 Kalibrerar mätare: ${calibrationValue} kWh @ ${calibrationDateTime}`
      );
      const result = await calibrateMeterReading(calibrationValue, calibDate);

      return result;
    } catch (error) {
      logger.error("Fel vid mätarkalibrering", error);
      reply.status(503);
      return { error: "Kunde inte genomföra kalibrering" };
    }
  });

  // GET /api/meter/calibrations – hämta kalibreringhistorik
  app.get("/api/meter/calibrations", async (request, reply) => {
    try {
      logger.info("Hämtar kalibreringhistorik");
      const history = await getCalibrationHistory();

      return history.map((c: any) => ({
        calibrationValue: c.calibrationValue,
        calibrationDateTime: c.calibrationDateTime,
        savedAt: c.createdAt,
      }));
    } catch (error) {
      logger.error("Fel vid hämtning av kalibreringhistorik", error);
      reply.status(503);
      return { error: "Kunde inte hämta kalibreringhistorik" };
    }
  });
}
