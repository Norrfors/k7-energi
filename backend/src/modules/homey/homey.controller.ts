import { FastifyInstance } from "fastify";
import { homeyService } from "./homey.service";
import { discoverHomey, getLocalIPs } from "./homey.discover";
import prisma from "../../shared/db";

// Controller = definierar vilka HTTP-endpoints som finns.
// Varje route kopplas till en funktion i service-lagret.

export async function homeyRoutes(app: FastifyInstance) {
  // GET /api/homey/discover – söker efter Homey Pro på lokalt LAN via mDNS
  app.get("/api/homey/discover", async (request, reply) => {
    try {
      console.log("[Discovery] Startar sökning efter Homey Pro på LAN...");
      const localIPs = getLocalIPs();
      const devices = await discoverHomey(8000);

      return {
        found: devices.length > 0,
        devices,
        localIPs,
        message:
          devices.length > 0
            ? `Hittade ${devices.length} Homey-enhet(er)`
            : "Ingen Homey hittades – kontrollera att Homey och datorn är på samma nätverk",
      };
    } catch (error) {
      console.error("[Discovery] Fel vid sökning:", error);
      reply.status(500);
      return { error: "Sökningen misslyckades", message: String(error) };
    }
  });

  // GET /api/homey/temperatures – hämta temperaturer just nu (från Homey real-time)
  app.get("/api/homey/temperatures", async (request, reply) => {
    try {
      const temperatures = await homeyService.getTemperatures();
      
      // Exportera som vanliga objekt med all info inkl zone
      const result = temperatures.map((t) => ({
        deviceId: t.deviceId,
        deviceName: t.deviceName,
        zone: t.zone || "Okänd",
        temperature: t.temperature,
        lastUpdated: t.lastUpdated,
      }));
      
      reply.send(result);
    } catch (error) {
      console.error("Kunde inte hämta temperaturer:", error);
      reply.status(503).send({
        error: "Kunde inte nå Homey",
        message: "Kontrollera att Homey är igång och att IP/token stämmer",
      });
    }
  });

  // GET /api/homey/energy – hämta energiförbrukning just nu (från Homey real-time)
  app.get("/api/homey/energy", async (request, reply) => {
    try {
      const energy = await homeyService.getEnergy();
      
      // Exportera som vanliga objekt med all info inkl zone
      const result = energy.map((e) => ({
        deviceId: e.deviceId,
        deviceName: e.deviceName,
        zone: e.zone || "Okänd",
        watts: e.watts,
        lastUpdated: e.lastUpdated,
      }));
      
      reply.send(result);
    } catch (error) {
      console.error("Kunde inte hämta energidata:", error);
      reply.status(503).send({
        error: "Kunde inte nå Homey",
        message: "Kontrollera att Homey är igång och att IP/token stämmer",
      });
    }
  });
}
