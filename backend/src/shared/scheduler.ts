import cron from "node-cron";
import { homeyService } from "../modules/homey/homey.service";
import { meterService } from "../modules/meter/meter.service";
import { Logger } from "./logger";

const logger = new Logger("Scheduler");

// Schemaläggare – kör uppgifter med jämna intervall.
// Syntaxen "*/5 * * * *" betyder "var 5:e minut".
// Det är standard cron-syntax (samma som i Linux/Unix).
//
// ┌────── minut (0-59)
// │ ┌──── timme (0-23)
// │ │ ┌── dag i månaden (1-31)
// │ │ │ ┌ månad (1-12)
// │ │ │ │ ┌ veckodag (0-7, 0 och 7 = söndag)
// │ │ │ │ │
// * * * * *

export function startScheduler() {
  // Logga temperaturer var 5:e minut
  cron.schedule("*/5 * * * *", async () => {
    try {
      logger.info("Loggar temperaturer...");
      await homeyService.logTemperatures();
    } catch (error) {
      logger.error("Schemalagd temperaturloggning misslyckades", error);
    }
  });

  // Logga energi var 5:e minut
  cron.schedule("*/5 * * * *", async () => {
    try {
      logger.info("Loggar energi...");
      await homeyService.logEnergy();
    } catch (error) {
      logger.error("Schemalagd energiloggning misslyckades", error);
    }
  });

  // Uppdatera mätardata varje minut
  cron.schedule("* * * * *", async () => {
    try {
      logger.info("Uppdaterar mätardata för Pulse Krokgatan 7...");
      await meterService.updateMeterReading();
    } catch (error) {
      logger.error("Mätardata uppdatering misslyckades", error);
    }
  });

  logger.info("Schemaläggare startad – loggar data var 5:e minut, mätardata varje minut");
}
