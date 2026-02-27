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
  zone: string | null; // Zone ID från Homey
  capabilities: string[];
  capabilitiesObj: Record<string, HomeyDeviceCapability>;
}

export class HomeyService {
  private address: string;
  private token: string;
  private zoneCache: Map<string, string> = new Map(); // zoneName -> zoneID

  constructor() {
    this.address = process.env.HOMEY_ADDRESS || "http://192.168.1.100";
    this.token = process.env.HOMEY_TOKEN || "";
    console.log(`[HomeyService] Initialiserad med address: ${this.address}`);
  }

  // Hämta och cacha alla zoner från Homey
  private async fetchZones(): Promise<Map<string, string>> {
    if (this.zoneCache.size > 0) {
      return this.zoneCache;
    }

    try {
      const response = await fetch(`${this.address}/api/manager/zones`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        console.warn(`[HomeyService] Kunde inte hämta zones: ${response.status}`);
        return new Map();
      }

      const zones = await response.json() as Record<string, { name: string; id: string }>;
      
      // Cacha: id -> namn
      Object.values(zones).forEach(zone => {
        this.zoneCache.set(zone.id, zone.name);
      });

      console.log(`[HomeyService] Cachade ${this.zoneCache.size} zoner från Homey`);
      return this.zoneCache;
    } catch (error) {
      console.error("[HomeyService] Fel vid hämtning av zones:", error);
      return new Map();
    }
  }

  // Slå upp zone-namn från zone-ID
  private async getZoneName(zoneId: string | null): Promise<string | null> {
    if (!zoneId) return null;

    const zones = await this.fetchZones();
    return zones.get(zoneId) || null;
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

    const results = [];
    for (const d of devices) {
      if (d.capabilities.includes("measure_temperature") || d.capabilities.includes("outdoorTemperature")) {
        const hasOutdoorTemp = d.capabilities.includes("outdoorTemperature");
        const tempValue = hasOutdoorTemp 
          ? d.capabilitiesObj?.outdoorTemperature?.value as number | null
          : d.capabilitiesObj?.measure_temperature?.value as number | null;
        const lastUpdated = hasOutdoorTemp
          ? d.capabilitiesObj?.outdoorTemperature?.lastUpdated || ""
          : d.capabilitiesObj?.measure_temperature?.lastUpdated || "";

        // Slå upp zone-namn från zone-ID
        const zoneName = await this.getZoneName(d.zone);

        results.push({
          deviceId: d.id,
          deviceName: d.name,
          zone: zoneName,
          temperature: tempValue,
          lastUpdated,
        });
      }
    }

    return results;
  }

  // Hämta all energiförbrukning just nu
  async getEnergy() {
    const devices = await this.fetchDevices();

    const results = [];
    for (const d of devices) {
      if (d.capabilities.includes("measure_power")) {
        const zoneName = await this.getZoneName(d.zone);

        results.push({
          deviceId: d.id,
          deviceName: d.name,
          zone: zoneName,
          watts: d.capabilitiesObj?.measure_power?.value as number | null,
          meterPower: d.capabilitiesObj?.meter_power?.value as number | null,
          lastUpdated: d.capabilitiesObj?.measure_power?.lastUpdated || "",
        });
      }
    }

    return results;
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
