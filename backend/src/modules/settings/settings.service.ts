// Service för inställningar och sensor-synlighet
import prisma from "../../shared/db";
import { homeyService } from "../homey/homey.service";

export interface SensorInfo {
  deviceId: string;
  deviceName: string;
  sensorType: "temperature" | "energy";
  isVisible: boolean;
  zone?: string; // Fysisk plats från Homey (Hall, Matsal, etc)
  classification?: string; // INNE, UTE eller tom sträng
}

/**
 * Hämta alla temperatursensorer från TemperatureLogs (unika) + live zoner från Homey
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

  // Hämta live temperatur-data för att få zonen
  let temperatureData: any[] = [];
  try {
    temperatureData = await homeyService.getTemperatures();
  } catch (error) {
    console.warn("[Settings] Kunde inte hämta live temperatur-data från Homey, använder databas-värden");
  }

  // Skapa en map för snabb lookup av zoner från Homey
  const homeyZoneMap = new Map<string, string>();
  for (const temp of temperatureData) {
    homeyZoneMap.set(temp.deviceId, temp.zone);
  }

  // Hämta visibility-status från databasen
  const sensors: SensorInfo[] = [];
  for (const log of logs) {
    const visibility = await prisma.sensorVisibility.findUnique({
      where: { deviceId: log.deviceId },
    });

    // Hämta zon från Homey (fysisk plats) och klassificering från databas (INNE/UTE)
    const zone = homeyZoneMap.get(log.deviceId);
    const classification = visibility?.zone ?? ""; // Klassificering sparad i zone-fältet tidigare!

    sensors.push({
      deviceId: log.deviceId,
      deviceName: log.deviceName,
      sensorType: "temperature",
      isVisible: visibility?.isVisible ?? true,
      zone: zone,
      classification: classification,
    });

    // Om den inte fanns, skapa ett record
    if (!visibility) {
      await prisma.sensorVisibility.create({
        data: {
          deviceId: log.deviceId,
          deviceName: log.deviceName,
          sensorType: "temperature",
          isVisible: true,
          zone: "", // Klassificering tom initialt
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

    // Hämta zon från Homey (fysisk plats) och klassificering från databas (INNE/UTE)
    const zone = homeyZoneMap.get(log.deviceId);
    const classification = visibility?.zone ?? ""; // Klassificering sparad i zone-fältet tidigare!

    sensors.push({
      deviceId: log.deviceId,
      deviceName: log.deviceName,
      sensorType: "energy",
      isVisible: visibility?.isVisible ?? true,
      zone: zone,
      classification: classification,
    });

    // Om den inte fanns, skapa ett record
    if (!visibility) {
      await prisma.sensorVisibility.create({
        data: {
          deviceId: log.deviceId,
          deviceName: log.deviceName,
          sensorType: "energy",
          isVisible: true,
          zone: "", // Klassificering tom initialt
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
