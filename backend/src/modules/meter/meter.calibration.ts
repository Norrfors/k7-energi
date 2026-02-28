/**
 * Meter Calibration Service
 * Hanterar manuell elmätarkalibrering och retroaktiv beräkning av mätarvärden
 */

import prisma from '../../shared/db';
import { Logger } from '../../shared/logger';

const logger = new Logger('MeterCalibration');

const PULSE_ID = 'c2314e97-c95b-40d4-9393-dbc541d586d1';
const PULSE_NAME = 'Pulse Krokgatan 7';

interface CalibrationResult {
  success: boolean;
  calibrationPoint: {
    calibrationValue: number;
    calibrationDateTime: string;
  };
  updatedRecords: number;
  message: string;
}

/**
 * Sparar en manuell mätaravläsning och räknar retroaktivt
 * alla mätarvärden framåt och bakåt från denna tidspunkten
 */
export async function calibrateMeterReading(
  calibrationValue: number,
  calibrationDateTime: Date
): Promise<CalibrationResult> {
  try {
    logger.info(`🔧 Startar mätarkalibrering: ${calibrationValue} kWh @ ${calibrationDateTime.toISOString()}`);

    // 1. Spara kalibreringspunkten
    const calibration = await prisma.meterCalibration.upsert({
      where: {
        deviceId_calibrationDateTime: {
          deviceId: PULSE_ID,
          calibrationDateTime,
        },
      },
      update: {
        calibrationValue,
      },
      create: {
        deviceId: PULSE_ID,
        calibrationValue,
        calibrationDateTime,
      },
    });

    logger.info(`✓ Kalibreringspunkt sparad: ${calibration.calibrationValue} kWh`);

    // 2. Hämta alla EnergyLog-poster för denna enheten
    const allEnergyLogs = await prisma.energyLog.findMany({
      where: { deviceId: PULSE_ID },
      orderBy: { createdAt: 'asc' },
    });

    if (allEnergyLogs.length === 0) {
      return {
        success: false,
        calibrationPoint: {
          calibrationValue,
          calibrationDateTime: calibrationDateTime.toISOString(),
        },
        updatedRecords: 0,
        message: 'Ingen energidata hittad',
      };
    }

    logger.info(`📊 Beräknar mätarvärden för ${allEnergyLogs.length} energiloggar...`);

    // 3. Hitta närmaste energilogg före och efter kalibreringen
    const calibrationTime = calibrationDateTime.getTime();
    
    let calibrationIndex = 0;
    for (let i = 0; i < allEnergyLogs.length; i++) {
      if (allEnergyLogs[i].createdAt.getTime() >= calibrationTime) {
        calibrationIndex = i;
        break;
      }
      calibrationIndex = i + 1;
    }

    logger.info(`📍 Kalibreringspunkt ligger mellan index ${calibrationIndex - 1} och ${calibrationIndex}`);

    // 4. Beräkna mätarvärde framåt från kalibreringen
    const meterValuesForward = calculateMeterValuesForward(
      allEnergyLogs,
      calibrationIndex,
      calibrationValue,
      calibrationDateTime
    );

    // 5. Beräkna mätarvärde bakåt från kalibreringen
    const meterValuesBackward = calculateMeterValuesBackward(
      allEnergyLogs,
      calibrationIndex,
      calibrationValue,
      calibrationDateTime
    );

    // 6. Kombinera resultaten
    const allCalculatedValues = meterValuesBackward.concat(meterValuesForward);

    logger.info(`✓ Beräknade ${allCalculatedValues.length} mätarvärden`);

    // 7. Uppdatera EnergyLog-tabellen med beräknade mätarvärden
    let updateCount = 0;
    for (const calc of allCalculatedValues) {
      const updated = await prisma.energyLog.updateMany({
        where: {
          deviceId: PULSE_ID,
          createdAt: calc.logDateTime,
        },
        data: {
          meterValue: calc.meterValue,
        },
      });

      updateCount += updated.count;
    }

    logger.info(`✓ Uppdaterade ${updateCount} EnergyLog-poster med mätarvärden`);

    return {
      success: true,
      calibrationPoint: {
        calibrationValue,
        calibrationDateTime: calibrationDateTime.toISOString(),
      },
      updatedRecords: updateCount,
      message: `Mätarkalibrering klar! ${updateCount} poster uppdaterade.`,
    };
  } catch (error) {
    logger.error(`❌ Kalibreringfel: ${error}`);
    throw error;
  }
}

/**
 * Beräknar mätarvärden framåt från kalibreringspunkten
 * genom att addera förbrukning (watts * tidsintervall)
 */
function calculateMeterValuesForward(
  energyLogs: any[],
  startIndex: number,
  startValue: number,
  startDateTime: Date
): Array<{ logDateTime: Date; meterValue: number }> {
  const results: Array<{ logDateTime: Date; meterValue: number }> = [];
  let currentMeterValue = startValue;

  for (let i = startIndex; i < energyLogs.length; i++) {
    const current = energyLogs[i];
    const previous = i > 0 ? energyLogs[i - 1] : null;

    if (!previous) continue;

    // Beräkna tidsintervall i minuter
    const timeInterval = (current.createdAt.getTime() - previous.createdAt.getTime()) / (1000 * 60);
    
    // Beräkna förbrukning: watts * tidsintervall / 60 = kWh
    const consumption = (current.watts * timeInterval) / 60;
    
    currentMeterValue += consumption;

    results.push({
      logDateTime: current.createdAt,
      meterValue: Math.min(currentMeterValue, 999999.99), // Max 6 siffror innan decimal
    });

    logger.debug(
      `⚡ Framåt: ${previous.createdAt.toISOString()} → ${current.createdAt.toISOString()} | ` +
      `${timeInterval.toFixed(1)}min @ ${current.watts}W = +${consumption.toFixed(3)}kWh → ${currentMeterValue.toFixed(2)}kWh`
    );
  }

  return results;
}

/**
 * Beräknar mätarvärden bakåt från kalibreringspunkten
 * genom att subtrahera förbrukning
 */
function calculateMeterValuesBackward(
  energyLogs: any[],
  endIndex: number,
  endValue: number,
  endDateTime: Date
): Array<{ logDateTime: Date; meterValue: number }> {
  const results: Array<{ logDateTime: Date; meterValue: number }> = [];
  let currentMeterValue = endValue;

  // Måste iterera bakåt från endIndex
  for (let i = endIndex - 1; i >= 0; i--) {
    const current = energyLogs[i];
    const next = energyLogs[i + 1];

    if (!next) continue;

    // Beräkna tidsintervall i minuter
    const timeInterval = (next.createdAt.getTime() - current.createdAt.getTime()) / (1000 * 60);

    // Beräkna förbrukning: watts * tidsintervall / 60 = kWh
    // Vi subtraherar detta värde när vi går bakåt
    const consumption = (next.watts * timeInterval) / 60;

    currentMeterValue -= consumption;
    currentMeterValue = Math.max(currentMeterValue, 0); // Kan inte vara negativ

    results.unshift({
      logDateTime: current.createdAt,
      meterValue: currentMeterValue,
    });

    logger.debug(
      `⚡ Bakåt: ${current.createdAt.toISOString()} ← ${next.createdAt.toISOString()} | ` +
      `-${consumption.toFixed(3)}kWh → ${currentMeterValue.toFixed(2)}kWh`
    );
  }

  return results;
}

/**
 * Beräknar förbrukning sedan midnatt
 * Baserat på mätarvärde vid mitten av dagen minus mätarvärde vid midnatt
 */
function calculateConsumptionSinceMidnight(logDateTime: Date, meterValue: number): number {
  // Hämता El. priset från förra dagen vid denna tiden från databasen
  // För nu returnerar vi bara differensen från dagens början
  
  // I praktiken skulle detta kunna komma från en cache eller separat beräkning
  // Men för nu antar vi att vi kan hämta första logg för dagen
  
  return Math.max(0, meterValue); // Placeholder - måste implementeras
}

/**
 * Hämtar tidigare kalibreringspunkter
 */
export async function getCalibrationHistory(): Promise<any[]> {
  return prisma.meterCalibration.findMany({
    where: { deviceId: PULSE_ID },
    orderBy: { calibrationDateTime: 'desc' },
    take: 10,
  });
}
