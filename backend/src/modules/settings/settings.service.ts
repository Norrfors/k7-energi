// Service för inställningar och sensor-synlighet
import prisma from "../../shared/db";
import { homeyService } from "../homey/homey.service";

export interface SensorInfo {
  deviceId: string;
  deviceName: string;
  sensorType: "temperature" | "energy";
  isVisible: boolean;
  zone?: string; // "INNE", "UTE" eller tom sträng
}

/**
 * Hämta alla temperatursensorer från TemperatureLogs (unika)
 */
export async function getAllTemperatureSensors(): Promise<SensorInfo[]> {
  const logs = await prisma.temperatureLog.findMany({
    distinct: ["deviceId"],
    select: {
      deviceId: true,
      deviceName: true,
    },
    orderBy: {
      deviceName: "asc",
    },
  });

  // Hämta visibility-status från databasen
  const sensors: SensorInfo[] = [];
  for (const log of logs) {
    const visibility = await prisma.sensorVisibility.findUnique({
      where: { deviceId: log.deviceId },
    });

    sensors.push({
      deviceId: log.deviceId,
      deviceName: log.deviceName,
      sensorType: "temperature",
      isVisible: visibility?.isVisible ?? true, // Default true om den inte finns i inställningar
      zone: visibility?.zone ?? "", // Hämta zone från SensorVisibility
    });

    // Om den inte fanns, skapa ett record
    if (!visibility) {
      await prisma.sensorVisibility.create({
        data: {
          deviceId: log.deviceId,
          deviceName: log.deviceName,
          sensorType: "temperature",
          isVisible: true,
          zone: "", // Default tom zon
        },
      });
    }
  }

  return sensors.sort((a, b) => a.deviceName.localeCompare(b.deviceName));
}

/**
 * Hämta alla elförbrukning-sensorer från EnergyLogs (unika) + live zoner från Homey
 */
export async function getAllEnergySensors(): Promise<SensorInfo[]> {
  const logs = await prisma.energyLog.findMany({
    distinct: ["deviceId"],
    select: {
      deviceId: true,
      deviceName: true,
    },
    orderBy: {
      deviceName: "asc",
    },
  });

  // Hämta live energi-data för att få zonen
  let energyData: any[] = [];
  try {
    energyData = await homeyService.getEnergy();
  } catch (error) {
    console.warn("[Settings] Kunde inte hämta live energi-data från Homey, använder databas-värden");
  }

  // Skapa en map för snabb lookup av zoner från Homey
  const homeyZoneMap = new Map<string, string>();
  for (const energy of energyData) {
    homeyZoneMap.set(energy.deviceId, energy.zone);
  }

  // Hämta visibility-status från databasen
  const sensors: SensorInfo[] = [];
  for (const log of logs) {
    const visibility = await prisma.sensorVisibility.findUnique({
      where: { deviceId: log.deviceId },
    });

    // Hämta zon från Homey live-data, fallback till databas
    const zone = homeyZoneMap.get(log.deviceId) || (visibility?.zone ?? "");

    sensors.push({
      deviceId: log.deviceId,
      deviceName: log.deviceName,
      sensorType: "energy",
      isVisible: visibility?.isVisible ?? true, // Default true om den inte finns i inställningar
      zone: zone,
    });

    // Om den inte fanns, skapa ett record
    if (!visibility) {
      await prisma.sensorVisibility.create({
        data: {
          deviceId: log.deviceId,
          deviceName: log.deviceName,
          sensorType: "energy",
          isVisible: true,
          zone: zone || "", // Använd Homey-zonen om vi fick en
        },
      });
    }
  }

  return sensors.sort((a, b) => a.deviceName.localeCompare(b.deviceName));
}

/**
 * Uppdatera visibility för en sensor
 */
export async function updateSensorVisibility(
  deviceId: string,
  isVisible: boolean
): Promise<SensorInfo> {
  const updated = await prisma.sensorVisibility.update({
    where: { deviceId },
    data: { isVisible },
  });

  return {
    deviceId: updated.deviceId,
    deviceName: updated.deviceName,
    sensorType: updated.sensorType as "temperature" | "energy",
    isVisible: updated.isVisible,
    zone: updated.zone,
  };
}

/**
 * Uppdatera zon för en sensor (INNE, UTE, eller tom sträng)
 */
export async function updateSensorZone(
  deviceId: string,
  zone: string
): Promise<SensorInfo> {
  const updated = await prisma.sensorVisibility.update({
    where: { deviceId },
    data: { zone },
  });

  return {
    deviceId: updated.deviceId,
    deviceName: updated.deviceName,
    sensorType: updated.sensorType as "temperature" | "energy",
    isVisible: updated.isVisible,
    zone: updated.zone,
  };
}
