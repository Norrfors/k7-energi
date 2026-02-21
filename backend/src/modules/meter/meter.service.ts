// Mätarservice – hanterar energimätardata för Pulse Krokgatan 7
// Lagrar förbrukning sedan midnatt och beräknar total mätarställning

import prisma from "../../shared/db";
import { homeyService } from "../homey/homey.service";
import { Logger } from "../../shared/logger";

const PULSE_ID = "c2314e97-c95b-40d4-9393-dbc541d586d1"; // Pulse Krokgatan 7
const PULSE_NAME = "Pulse Krokgatan 7";

export class MeterService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger("MeterService");
  }

  /**
   * Hämta senaste mätardata från databasen
   */
  async getLatestMeterReading() {
    try {
      const reading = await prisma.meterReading.findFirst({
        where: { deviceId: PULSE_ID },
        orderBy: { createdAt: "desc" },
      });
      return reading || null;
    } catch (error) {
      this.logger.error("Fel vid hämtning av mätardata", error);
      throw error;
    }
  }

  /**
   * Hämta alla mätardata för en dag (sedan midnatt)
   */
  async getMeterReadingsSinceToday() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Midnatt

      const readings = await prisma.meterReading.findMany({
        where: {
          deviceId: PULSE_ID,
          createdAt: { gte: today },
        },
        orderBy: { createdAt: "asc" },
      });

      return readings;
    } catch (error) {
      this.logger.error("Fel vid hämtning av dagens mätardata", error);
      throw error;
    }
  }

  /**
   * Hämta mätardata för senaste 24 timmar
   */
  async getMeterReadingsLast24Hours() {
    try {
      const last24h = new Date();
      last24h.setHours(last24h.getHours() - 24); // 24 timmar tillbaka

      const readings = await prisma.meterReading.findMany({
        where: {
          deviceId: PULSE_ID,
          createdAt: { gte: last24h },
        },
        orderBy: { createdAt: "asc" },
      });

      return readings;
    } catch (error) {
      this.logger.error("Fel vid hämtning av 24h mätardata", error);
      throw error;
    }
  }

  /**
   * Uppdatera mätardata
   * - Hämta meter_power från Homey (förbrukning sedan midnatt)
   * - Lägg till tidigare total mätarställning
   * - Spara till DB
   */
  async updateMeterReading() {
    try {
      this.logger.info("Uppdaterar mätardata for Pulse Krokgatan 7...");

      // Hämta energidata från Homey
      const energyData = await homeyService.getEnergy();
      const pulseData = energyData.find((e) => e.deviceId === PULSE_ID);

      if (!pulseData) {
        this.logger.warn("Pulse Krokgatan 7 hittades inte i energidata");
        return null;
      }

      // DEBUG: Loggning för att se vad vi får från Homey
      this.logger.info(`DEBUG pulseData: ${JSON.stringify(pulseData)}`);

      // consumptionSinceMidnight = raw meter_power från Homey (spara som-är)
      const consumptionSinceMidnight = (pulseData.meterPower as number) || 0;
      this.logger.info(`DEBUG consumptionSinceMidnight=${consumptionSinceMidnight}, meterPower=${pulseData.meterPower}`);

      // Beräkna totalMeterValue och konsumtion sedan föregående
      const lastReading = await this.getLatestMeterReading();
      let totalMeterValue = consumptionSinceMidnight; // Default: första mätningen idag
      let consumptionSincePreviousReading = 0; // Default: ingen tidigare

      if (lastReading) {
        // Beräkna förbrukning sedan föregående avläsning
        consumptionSincePreviousReading = Math.max(0, consumptionSinceMidnight - lastReading.consumptionSinceMidnight);
        
        // Checka om det är en ny dag (jämför datum)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastReadingDate = new Date(lastReading.createdAt);
        lastReadingDate.setHours(0, 0, 0, 0);
        
        const isNewDay = today.getTime() !== lastReadingDate.getTime();

        if (isNewDay) {
          // Ny dag – addera igårs fulla förbrukning
          totalMeterValue = lastReading.totalMeterValue + lastReading.consumptionSinceMidnight;
        } else {
          // Samma dag – addera skillnaden från igår
          totalMeterValue = lastReading.totalMeterValue + consumptionSincePreviousReading;
        }
      }

      // Spara till DB
      const newReading = await prisma.meterReading.create({
        data: {
          deviceId: PULSE_ID,
          deviceName: PULSE_NAME,
          consumptionSinceMidnight,
          consumptionSincePreviousReading,
          totalMeterValue,
        },
      });

      this.logger.info(
        `Mätardata uppdaterad: förbrukning=${consumptionSinceMidnight} kWh, total=${totalMeterValue} kWh`
      );

      return newReading;
    } catch (error) {
      this.logger.error("Fel vid uppdatering av mätardata", error);
      throw error;
    }
  }

  /**
   * Spara mätarställning manuellt (från frontend-settings)
   * OBS: consumptionSinceMidnight ändras INTE – den hämtas från Homey
   */
  async setManualMeterValue(totalMeterValue: number) {
    try {
      this.logger.info(`Manuell mätarställning inställd: ${totalMeterValue} kWh`);

      // Hämta aktuell förbrukning från Homey (meter_power = raw data)
      const energyData = await homeyService.getEnergy();
      const pulseData = energyData.find((e) => e.deviceId === PULSE_ID);
      const consumptionSinceMidnight = (pulseData?.meterPower as number) || 0;

      const newReading = await prisma.meterReading.create({
        data: {
          deviceId: PULSE_ID,
          deviceName: PULSE_NAME,
          consumptionSinceMidnight,
          consumptionSincePreviousReading: 0, // Manuell inställning, ingen delta
          totalMeterValue,
        },
      });

      this.logger.info(`Manuell mätarställning sparad: ${totalMeterValue} kWh`);
      return newReading;
    } catch (error) {
      this.logger.error("Fel vid manuell mätarställning", error);
      throw error;
    }
  }
}

// Exportera singleton
export const meterService = new MeterService();
