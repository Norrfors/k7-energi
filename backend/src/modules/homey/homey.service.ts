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

  // Extrahera och mappa enhets-zon
  private getZoneForDevice(deviceName: string): string {
    // Försök automatiskt extrahera från namn (ofta sista ordet eller inom parenteser)
    // För sensorer som "k7 — BV Vardagsrum" -> "Vardagsrum"
    const parts = deviceName.split(" — ");
    if (parts.length > 1) {
      return parts[parts.length - 1].trim();
    }

    // Eller ordet dentro parenteser
    const parenMatch = deviceName.match(/\((.*?)\)/);
    if (parenMatch) {
      return parenMatch[1].trim();
    }

    // Ou sista ordet
    const words = deviceName.trim().split(" ");
    if (words.length > 1) {
      return words[words.length - 1];
    }

    // Fallback
    return "Okänd";
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
    
    // Debug: Logga Element-Klimat om den finns
    const elementKlimat = Object.values(devices).find((d: any) => d.name?.includes("Element-Klimat"));
    if (elementKlimat) {
      console.log("[HomeyService] Element-Klimat hittad - capabilities:", (elementKlimat as any).capabilities);
    }
    
    return Object.values(devices) as HomeyDevice[];
  }

  // Hämta alla temperaturer just nu
  async getTemperatures() {
    const devices = await this.fetchDevices();

    return devices
      .filter((d) => 
        d.capabilities.includes("measure_temperature") || 
        d.capabilities.includes("outdoorTemperature") ||
        d.capabilities.some((c) => c.startsWith("measure_temperature."))
      )
      .map((d) => {
        let tempValue: number | null = null;
        let lastUpdated = "";

        // Försök hämta measure_temperature
        if (d.capabilitiesObj?.measure_temperature?.value) {
          tempValue = d.capabilitiesObj.measure_temperature.value as number;
          lastUpdated = d.capabilitiesObj.measure_temperature.lastUpdated || "";
        }
        // Försök hämta outdoorTemperature
        else if (d.capabilitiesObj?.outdoorTemperature?.value) {
          tempValue = d.capabilitiesObj.outdoorTemperature.value as number;
          lastUpdated = d.capabilitiesObj.outdoorTemperature.lastUpdated || "";
        }
        // Försök hämta measure_temperature.outdoorTemperature (nested)
        else {
          const nestedCapability = d.capabilities.find((c) => c === "measure_temperature.outdoorTemperature");
          if (nestedCapability && d.capabilitiesObj?.[nestedCapability]?.value) {
            tempValue = d.capabilitiesObj[nestedCapability].value as number;
            lastUpdated = d.capabilitiesObj[nestedCapability].lastUpdated || "";
          }
        }

        return {
          deviceId: d.id,
          deviceName: d.name,
          zone: this.getZoneForDevice(d.name),
          temperature: tempValue,
          lastUpdated,
        };
      })
      // Filtrera bort sensorer som inte har något temperaturvärde
      .filter((t) => t.temperature !== null);
  }

  // Hämta all energiförbrukning just nu
  async getEnergy() {
    const devices = await this.fetchDevices();

    return devices
      .filter((d) => d.capabilities.includes("measure_power"))
      .map((d) => ({
        deviceId: d.id,
        deviceName: d.name,
        zone: this.getZoneForDevice(d.name),
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
            zone: reading.zone,
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
            zone: reading.zone,
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
