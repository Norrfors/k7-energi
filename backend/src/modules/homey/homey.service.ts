// HomeyService – pratar med din Homey Pro via lokalt nätverk.
//
// Tanken: denna service anropas antingen:
// 1. Vid schemalagda intervall (cron) för att spara data till databasen
// 2. Direkt från en controller för att visa realtidsdata

// OBS: homey-api paketet kan kräva lite anpassning.
// Om importen inte fungerar direkt, se kommentaren längst ner.

import prisma from "../../shared/db";
import { recalculateMeterValuesFromLatestCalibration } from "../meter/meter.calibration";

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

  // Manuell mappning av sensornamn till zoner (baserat på sensorernas namn)
  private deviceZoneMapping: Record<string, string> = {
    // Occupancy sensorer
    "Outdoor Occupancy Sensor GARAGE": "Garage",
    "Outdoor Occupancy Sensor HUVUDENTRE": "Huvudentre",
    
    // k7 sensorer - ÖV (Övervåning)
    "k7 – ÖV Huvudsovrum": "Huvudsovrum",
    "k7 – ÖV Sovrum Norr": "Sovrum Norr",
    "k7 – ÖV Sovrum Syd": "Sovrum Syd",
    "k7 – ÖV Hall": "ÖV Hall",
    "k7 – ÖV Kontor": "Kontor",
    
    // k7 sensorer - BV (Bottenvåning)
    "k7 BV  – Vardagsrum": "Vardagsrum",
    "k7 – BV Hall": "BV Hall",
    "k7 – BV Matsal": "Matsal",
    
    // Termostater
    "ÖV Badrum termostat  4512744/45": "Badrum",
    
    // Hybrid/annat
    "k7 (K7-INNE) – K7-INNE": "K7-INNE",
    "k7 (K7-INNE) – K7-UTE": "K7-INNE",
    
    // Altherma
    "Altherma Hotwatertank": "Värmepump",
    
    // WH2 sensorer  
    "WH2 Inne Gatuplan": "Gatuplan",
    "WH2 UTE Norr Inglas ": "UTE Norr",
    "WH2 ÖV  xx IN": "ÖV",
    "WH2 ny  UTE Telldus ": "UTE",
    "WH2 ÖV UTE ": "ÖV UTE",
    "WH2 kanske skyddsrum eller garage": "Garage/Skyddsrum",
    "WH2 -- kanske garage el skyddsrum": "Garage/Skyddsrum",
    
    // Oregon sensorer
    "Oregon INNE": "INNE",
    "Oregon Temp THGN800": "UTE",
    
    // Övriga
    "Namron Multisensor 4512734": "Multisensor",
    "T01": "T01",
    "WH2 x OUT": "UTE",
  };

  constructor() {
    this.address = process.env.HOMEY_ADDRESS || "http://192.168.1.100";
    this.token = process.env.HOMEY_TOKEN || "";
    console.log(`[HomeyService] Initialiserad med address: ${this.address}`);
  }

  // Extrahera och mappa enhets-zon från sensornamnet
  private getZoneForDevice(deviceName: string): string {
    // Först: Kolla om den finns i manuell mappning
    if (this.deviceZoneMapping[deviceName]) {
      return this.deviceZoneMapping[deviceName];
    }

    // Sedan: Försök automatiskt extrahera från namn
    // För sensorer som "k7 – BV Vardagsrum" eller "k7 — ÖV Sovrum Norr"
    // Försök matcher för olika bindestreckvariationer
    
    // Matcher för "k7 – ÖV Sovrum Norr" pattern
    let match = deviceName.match(/k7\s*[-–—]\s*[ÖÆ]V\s+(.+)/);
    if (match) return match[1].trim();
    
    // Matcher för "k7 – BV Vardagsrum" pattern  
    match = deviceName.match(/k7\s*[-–—]\s*BV\s+(.+)/);
    if (match) return match[1].trim();
    
    // Matcher för "k7 BV – Vardagsrum" pattern (två ord innan tankestreck)
    match = deviceName.match(/k7\s+BV\s*[-–—]\s*(.+)/);
    if (match) return match[1].trim();
    
    // Matcher för "k7 (X) – Y" pattern
    match = deviceName.match(/k7\s*\([^)]*\)\s*[-–—]\s*(.+)/);
    if (match) return match[1].trim();
    
    // Matcher för sensornamn med mellanslag
    match = deviceName.match(/(.+?)\s+[-–—]\s+/);
    if (match) return match[1].trim();

    // Matcher för WH2 sensorer
    match = deviceName.match(/WH2\s+(.+)/);
    if (match) {
      let zone = match[1].trim();
      // Rensa upp lite
      if (zone.includes("UTE")) return "UTE";
      if (zone.includes("INNE") || zone.includes("Inne")) return "INNE";
      return zone;
    }
    
    // Matcher för Oregon sensorer
    if (deviceName.includes("Oregon")) {
      if (deviceName.includes("INNE") || deviceName.includes("Inne")) return "INNE";
      if (deviceName.includes("THGN")) return "UTE";
      return "Oregon";
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

        // Hämta zone från sensornamnet
        const zone = this.getZoneForDevice(d.name);

        results.push({
          deviceId: d.id,
          deviceName: d.name,
          zone: zone,
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
        const zone = this.getZoneForDevice(d.name);

        // Hämta accumulated cost om den finns (för Pulse)
        const costSinceMidnight = d.capabilitiesObj?.accumulatedCost?.value as number | null;

        results.push({
          deviceId: d.id,
          deviceName: d.name,
          zone: zone,
          watts: d.capabilitiesObj?.measure_power?.value as number | null,
          meterPower: d.capabilitiesObj?.meter_power?.value as number | null,
          costSinceMidnight: costSinceMidnight || null,
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
            meterPower: reading.meterPower || undefined,
          },
        });
      }
    }

    console.log(`Loggade ${readings.length} energiavläsningar`);

    // 🔄 Beräkna mätarvärden retroaktivt från senaste kalibreringspunkt
    await recalculateMeterValuesFromLatestCalibration();
  }
}

// Exportera en singleton-instans
export const homeyService = new HomeyService();
