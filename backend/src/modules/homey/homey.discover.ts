// homey.discover.ts – Söker efter Homey Pro på lokalt nätverk via mDNS
// Homey Pro annonserar sig via mDNS under tjänsten "_homey._tcp"

import { Bonjour, Service } from "bonjour-service";
import * as os from "os";

export interface DiscoveredHomey {
  name: string;
  host: string;
  addresses: string[];
  port: number;
  txt: Record<string, string>;
}

// Hämta lokala nätverksadresser för att visa i felsökning
export function getLocalIPs(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }

  return ips;
}

// Söker efter Homey Pro på LAN via mDNS (Bonjour/Zeroconf)
// Returerar hittade enheter inom timeout-perioden
export function discoverHomey(timeoutMs = 8000): Promise<DiscoveredHomey[]> {
  return new Promise((resolve) => {
    const bonjour = new Bonjour();
    const found: DiscoveredHomey[] = [];
    const seenHosts = new Set<string>();

    const browser = bonjour.find({ type: "homey" }, (service: Service) => {
      const key = service.host || service.name;
      if (seenHosts.has(key)) return;
      seenHosts.add(key);

      console.log(`[Discovery] Hittade Homey: ${service.name} @ ${service.host}`);
      found.push({
        name: service.name,
        host: service.host,
        addresses: service.addresses || [],
        port: service.port,
        txt: (service.txt as Record<string, string>) || {},
      });
    });

    // Sök även efter generisk HTTP-tjänst med "homey" i namnet som fallback
    const browserHttp = bonjour.find({ type: "http" }, (service: Service) => {
      const nameLower = service.name.toLowerCase();
      if (!nameLower.includes("homey")) return;

      const key = service.host || service.name;
      if (seenHosts.has(key)) return;
      seenHosts.add(key);

      console.log(`[Discovery] Hittade Homey (HTTP): ${service.name} @ ${service.host}`);
      found.push({
        name: service.name,
        host: service.host,
        addresses: service.addresses || [],
        port: service.port,
        txt: (service.txt as Record<string, string>) || {},
      });
    });

    // Stoppa sökningen efter timeout
    setTimeout(() => {
      browser.stop();
      browserHttp.stop();
      bonjour.destroy();
      resolve(found);
    }, timeoutMs);
  });
}
