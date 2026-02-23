// HomeyService – pratar med din Homey Pro via lokalt nätverk.
//
// Tanken: denna service anropas antingen:
// 1. Vid schemalagda intervall (cron) för att spara data till databasen
// 2. Direkt från en controller för att visa realtidsdata

// OBS: homey-api paketet kan kräva lite anpassning.
// Om importen inte fungerar direkt, se kommentaren längst ner.

import prisma from "../../shared/db";

// Typer för det vi får tillbaka från Homey
interface HomeyDeviceCapability {
  value: number | string | boolean | null;
  lastUpdated: string;
}

interface HomeyDevice {
  id: string;
  name: string;
  zoneName?: string;
  capabilities: string[];
  capabilitiesObj: Record<string, HomeyDeviceCapability>;
}

export class HomeyService {
  private address: string;
  private token: string;

  constructor() {
    this.address = process.env.HOMEY_ADDRESS || "http://192.168.1.100";
    this.token = process.env.HOMEY_TOKEN || "";
    console.log(`[HomeyService] Initialiserad med address: ${this.address}`);
  }

  // Hämta alla enheter direkt via HTTP (utan homey-api biblioteket)
  // Detta är enklare att komma igång med
  private async fetchDevices(): Promise<HomeyDevice[]> {
    const response = await fetch(`${this.address}/api/manager/devices/device/`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Homey API svarade med ${response.status}`);
    }
    const devices = await response.json() as Record<string, HomeyDevice>;
    
    return Object.values(devices) as HomeyDevice[];
  }

  // Hämta alla temperaturer just nu
  async getTemperatures() {
    const devices = await this.fetchDevices();

    return devices
      .filter((d) => d.capabilities.includes("measure_temperature") || d.capabilities.includes("outdoorTemperature"))
      .map((d) => {
        const hasOutdoorTemp = d.capabilities.includes("outdoorTemperature");
        const tempValue = hasOutdoorTemp 
          ? d.capabilitiesObj?.outdoorTemperature?.value as number | null
          : d.capabilitiesObj?.measure_temperature?.value as number | null;
        const lastUpdated = hasOutdoorTemp
          ? d.capabilitiesObj?.outdoorTemperature?.lastUpdated || ""
          : d.capabilitiesObj?.measure_temperature?.lastUpdated || "";

        return {
          deviceId: d.id,
          deviceName: d.name,
          temperature: tempValue,
          lastUpdated,
        };
      });
  }

  // Hämta all energiförbrukning just nu
  async getEnergy() {
    const devices = await this.fetchDevices();

    return devices
      .filter((d) => d.capabilities.includes("measure_power"))
      .map((d) => ({
        deviceId: d.id,
        deviceName: d.name,
        watts: d.capabilitiesObj?.measure_power?.value as number | null,
        meterPower: d.capabilitiesObj?.meter_power?.value as number | null,
        lastUpdated: d.capabilitiesObj?.measure_power?.lastUpdated || "",
      }));
  }

  // Spara en snapshot av temperaturer till databasen
  async logTemperatures() {
    const readings = await this.getTemperatures();

    for (const reading of readings) {
      if (reading.temperature !== null) {
        await prisma.temperatureLog.create({
          data: {
            deviceId: reading.deviceId,
            deviceName: reading.deviceName,
            zone: "Okänd",
            temperature: reading.temperature,
          },
        });
      }
    }

    console.log(`Loggade ${readings.length} temperaturavläsningar`);
  }

  // Spara en snapshot av energidata till databasen
  async logEnergy() {
    const readings = await this.getEnergy();

    for (const reading of readings) {
      if (reading.watts !== null) {
        await prisma.energyLog.create({
          data: {
            deviceId: reading.deviceId,
            deviceName: reading.deviceName,
            zone: "Okänd",
            watts: reading.watts,
          },
        });
      }
    }

    console.log(`Loggade ${readings.length} energiavläsningar`);
  }
}

// Exportera en singleton-instans
export const homeyService = new HomeyService();
