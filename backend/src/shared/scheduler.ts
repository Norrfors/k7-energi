import cron from "node-cron";
import { homeyService } from "../modules/homey/homey.service";

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
      console.log("Schemalagd: Loggar temperaturer...");
      await homeyService.logTemperatures();
    } catch (error) {
      console.error("Schemalagd temperaturloggning misslyckades:", error);
    }
  });

  // Logga energi var 5:e minut
  cron.schedule("*/5 * * * *", async () => {
    try {
      console.log("Schemalagd: Loggar energi...");
      await homeyService.logEnergy();
    } catch (error) {
      console.error("Schemalagd energiloggning misslyckades:", error);
    }
  });

  console.log("Schemaläggare startad – loggar data var 5:e minut");
}
