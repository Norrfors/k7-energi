// HomeyService – pratar med din Homey Pro via lokalt nätverk.
//
// Tanken: denna service anropas antingen:
// 1. Vid schemalagda intervall (cron) för att spara data till databasen
// 2. Direkt från en controller för att visa realtidsdata

import https from "https";
import http from "http";
import { URL } from "url";
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
  zone: string | null; // Zone ID (UUID) från Homey
  capabilities: string[];
  capabilitiesObj: Record<string, HomeyDeviceCapability>;
}

// Zon-info med fullständig sökvägsinformation
interface ZoneInfo {
  name: string;       // Direkt zonnamn (t.ex. "Altan norr")
  parentId: string | null;
  path: string;       // Full stig (t.ex. "Hem / Bottenvåningen / Altan norr")
}

export class HomeyService {
  private address: string;
  private token: string;
  private httpsAgent: https.Agent;
  // Cache: UUID -> ZoneInfo (hämtas en gång per instans)
  private zoneCache: Record<string, ZoneInfo> | null = null;

  // Manuell mappning av sensornamn till zoner (fallback om Homey saknar zon-tilldelning)
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

    // Energisensorer
    "VU-A6Z-Nous": "Soldäck",
    "VU-Effektmät": "Altan norr",
    "VUz-01Plug-in Switch Mini": "Kök",
    "Pulse Krokgatan 7": "Tvätt/Pann/Bad",
  };

  constructor() {
    this.address = process.env.HOMEY_ADDRESS || "http://192.168.1.100";
    this.token = process.env.HOMEY_TOKEN || "";
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });
    console.log(`[HomeyService] Initialiserad med address: ${this.address}`);
  }

  // Extrahera och mappa enhets-zon från sensornamnet (fallback)
  private getZoneForDevice(deviceName: string): string {
    if (this.deviceZoneMapping[deviceName]) {
      return this.deviceZoneMapping[deviceName];
    }

    let match = deviceName.match(/k7\s*[-–—]\s*[ÖÆ]V\s+(.+)/);
    if (match) return match[1].trim();

    match = deviceName.match(/k7\s*[-–—]\s*BV\s+(.+)/);
    if (match) return match[1].trim();

    match = deviceName.match(/k7\s+BV\s*[-–—]\s*(.+)/);
    if (match) return match[1].trim();

    match = deviceName.match(/k7\s*\([^)]*\)\s*[-–—]\s*(.+)/);
    if (match) return match[1].trim();

    match = deviceName.match(/(.+?)\s+[-–—]\s+/);
    if (match) return match[1].trim();

    match = deviceName.match(/WH2\s+(.+)/);
    if (match) {
      const zone = match[1].trim();
      if (zone.includes("UTE")) return "UTE";
      if (zone.includes("INNE") || zone.includes("Inne")) return "INNE";
      return zone;
    }

    if (deviceName.includes("Oregon")) {
      if (deviceName.includes("INNE") || deviceName.includes("Inne")) return "INNE";
      if (deviceName.includes("THGN")) return "UTE";
      return "Oregon";
    }

    return "Okänd";
  }

  // Hjälpmetod för att göra HTTP/HTTPS anrop med SSL-hantering
  private async makeRequest<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        ...(protocol === https && {
          rejectUnauthorized: false,
        }),
      };

      const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`Kunde inte tolka JSON från Homey: ${e}`));
            }
          } else {
            reject(new Error(`Homey API svarade med statuskod ${res.statusCode}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    });
  }

  // Hämta och cacha zon-mappning UUID -> ZoneInfo (med full sökvägsinformation)
  private async fetchZones(): Promise<Record<string, ZoneInfo>> {
    if (this.zoneCache) return this.zoneCache;
    try {
      const url = `${this.address}/api/manager/zones/zone/`;
      const raw = await this.makeRequest<Record<string, { id: string; name: string; parent?: string }>>(url);

      // Bygg namn- och föräldrakartor
      const names: Record<string, string> = {};
      const parentIds: Record<string, string | null> = {};
      for (const z of Object.values(raw)) {
        if (z.id && z.name) {
          names[z.id] = z.name;
          parentIds[z.id] = z.parent || null;
        }
      }

      // Bygg full zonestig rekursivt (skydd mot cyklar via djupbegränsning)
      const buildPath = (id: string, depth = 0): string => {
        if (depth > 10 || !names[id]) return names[id] || '';
        const parentId = parentIds[id];
        if (!parentId || !names[parentId]) return names[id];
        return `${buildPath(parentId, depth + 1)} / ${names[id]}`;
      };

      this.zoneCache = {};
      for (const id of Object.keys(names)) {
        this.zoneCache[id] = {
          name: names[id],
          parentId: parentIds[id],
          path: buildPath(id),
        };
      }
    } catch (e) {
      console.warn('[HomeyService] Kunde inte hämta zoner, fallback till namnmappning:', e);
      this.zoneCache = {};
    }
    return this.zoneCache;
  }

  // Löser ett Homey zon-UUID till ZoneInfo
  // Returnerar null om UUID saknas eller inte hittas i Homey
  private async resolveZoneInfo(zoneId: string | null): Promise<ZoneInfo | null> {
    if (!zoneId) return null;
    const zones = await this.fetchZones();
    return zones[zoneId] || null;
  }

  // Hämta alla enheter direkt via HTTP
  private async fetchDevices(): Promise<HomeyDevice[]> {
    const url = `${this.address}/api/manager/devices/device/`;
    console.log(`[HomeyService] Försöker hämta enheter från: ${url}`);
    const devices = await this.makeRequest<Record<string, HomeyDevice>>(url);
    return Object.values(devices) as HomeyDevice[];
  }

  // Synka alla Homey-enheter till Device-tabellen (upsert)
  // Anropas varje poll-cykel så att namn och zon alltid är aktuella
  async syncDevices(): Promise<void> {
    try {
      const devices = await this.fetchDevices();
      const zones = await this.fetchZones();

      for (const d of devices) {
        const zoneInfo = d.zone ? zones[d.zone] || null : null;

        await prisma.device.upsert({
          where: { id: d.id },
          update: {
            name: d.name,
            zoneId: d.zone || null,
            zoneName: zoneInfo?.name || this.getZoneForDevice(d.name),
            zonePath: zoneInfo?.path || this.getZoneForDevice(d.name),
          },
          create: {
            id: d.id,
            name: d.name,
            zoneId: d.zone || null,
            zoneName: zoneInfo?.name || this.getZoneForDevice(d.name),
            zonePath: zoneInfo?.path || this.getZoneForDevice(d.name),
          },
        });
      }

      console.log(`[HomeyService] Synkade ${devices.length} enheter till Device-tabellen`);
    } catch (error) {
      console.error('[HomeyService] Fel vid enhetssynkning:', error);
    }
  }

  // Hämta capabilities för en specifik enhet från Homey
  async getDeviceCapabilities(deviceId: string): Promise<string[]> {
    try {
      const devices = await this.fetchDevices();
      const device = devices.find((d) => d.id === deviceId);
      if (device && device.capabilities) {
        return device.capabilities.filter(cap =>
          cap.startsWith('measure_') ||
          cap.startsWith('meter_') ||
          cap === 'accumulatedCost' ||
          cap === 'accumulator'
        );
      }
      return [];
    } catch (error) {
      console.error(`[HomeyService] Kunde inte hämta capabilities för ${deviceId}:`, error);
      return [];
    }
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

        const zoneInfo = await this.resolveZoneInfo(d.zone);
        const zoneName = zoneInfo?.name || this.getZoneForDevice(d.name);

        results.push({
          deviceId: d.id,
          deviceName: d.name,
          zone: zoneName,
          zonePath: zoneInfo?.path || zoneName,
          zoneId: d.zone || null,
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
        const zoneInfo = await this.resolveZoneInfo(d.zone);
        const zoneName = zoneInfo?.name || this.getZoneForDevice(d.name);

        const costSinceMidnight = d.capabilitiesObj?.accumulatedCost?.value as number | null;

        results.push({
          deviceId: d.id,
          deviceName: d.name,
          zone: zoneName,
          zonePath: zoneInfo?.path || zoneName,
          zoneId: d.zone || null,
          watts: d.capabilitiesObj?.measure_power?.value as number | null,
          meterPower: d.capabilitiesObj?.meter_power?.value as number | null,
          meterImported: (d.capabilitiesObj as any)?.['meter_power.imported']?.value as number | null,
          costSinceMidnight: costSinceMidnight || null,
          lastUpdated: d.capabilitiesObj?.measure_power?.lastUpdated || "",
        });
      }
    }

    return results;
  }

  // Spara en snapshot av temperaturer till databasen
  async logTemperatures() {
    // Synka enheter varje cykel så Device-tabellen alltid är aktuell
    await this.syncDevices();
    const readings = await this.getTemperatures();

    for (const reading of readings) {
      if (reading.temperature !== null) {
        await prisma.temperatureLog.create({
          data: {
            deviceId: reading.deviceId,
            deviceName: reading.deviceName,
            zone: reading.zone,
            zoneId: reading.zoneId || undefined,
            temperature: reading.temperature,
          },
        });
      }
    }

    console.log(`Loggade ${readings.length} temperaturavläsningar`);
  }

  // Hämta aktuella elpriser från Tibber-enheter i Homey
  async getPrices() {
    const devices = await this.fetchDevices();

    const results = [];
    for (const d of devices) {
      if (d.capabilities.includes("measure_price_total")) {
        const zoneInfo = await this.resolveZoneInfo(d.zone);

        results.push({
          deviceId: d.id,
          deviceName: d.name,
          zoneId: d.zone || null,
          priceTotal: d.capabilitiesObj?.measure_price_total?.value as number | null,
          priceLevel: d.capabilitiesObj?.price_level?.value as string | null,
          priceLowest: d.capabilitiesObj?.measure_price_lowest?.value as number | null,
          priceHighest: d.capabilitiesObj?.measure_price_highest?.value as number | null,
        });
      }
    }

    return results;
  }

  // Spara elpriser till databasen – loggar bara när priset faktiskt ändras
  // Normalt en gång per timme (Tibber uppdaterar timpriset vid varje heltimme)
  async logPrices() {
    const readings = await this.getPrices();
    let logged = 0;

    for (const reading of readings) {
      if (reading.priceTotal === null) continue;

      // Hämta senaste loggade pris för denna enhet
      const lastLog = await prisma.priceLog.findFirst({
        where: { deviceId: reading.deviceId },
        orderBy: { createdAt: "desc" },
      });

      // Logga bara om priset eller nivån ändrats (tolerans 0,0001 kr för floating point)
      const priceChanged = !lastLog ||
        Math.abs((lastLog.priceTotal ?? 0) - reading.priceTotal) > 0.0001 ||
        lastLog.priceLevel !== reading.priceLevel;

      if (priceChanged) {
        await prisma.priceLog.create({
          data: {
            deviceId: reading.deviceId,
            deviceName: reading.deviceName,
            zoneId: reading.zoneId || undefined,
            priceTotal: reading.priceTotal,
            priceLevel: reading.priceLevel || undefined,
            priceLowest: reading.priceLowest ?? undefined,
            priceHighest: reading.priceHighest ?? undefined,
          },
        });
        logged++;
      }
    }

    if (logged > 0) {
      console.log(`Loggade ${logged} prisändring(ar)`);
    }
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
            zoneId: reading.zoneId || undefined,
            watts: reading.watts,
            meterPower: reading.meterPower || undefined,
            meterImported: reading.meterImported || undefined,
            accumulatedCost: reading.costSinceMidnight || undefined,
          },
        });
      }
    }

    console.log(`Loggade ${readings.length} energiavläsningar`);

    // Beräkna mätarvärden retroaktivt från senaste kalibreringspunkt
    await recalculateMeterValuesFromLatestCalibration();
  }
}

// Exportera en singleton-instans
export const homeyService = new HomeyService();
