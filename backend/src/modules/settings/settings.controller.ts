// Controller för inställningar och sensor-synlighet
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  getAllTemperatureSensors,
  getAllEnergySensors,
  updateSensorVisibility,
  updateSensorZone,
} from "./settings.service";

/**
 * Registrera alla settings-rutter
 */
export async function settingsRoutes(app: FastifyInstance) {
  try {
    console.log("[Settings] Registrerar settings-routes...");

    // DEBUG: Simple test route
    app.get("/api/mysettings/test", async (req, reply) => {
      return { message: "Settings test route works!" };
    });

    // GET /api/settings/sensors/temperature
    app.get("/api/settings/sensors/temperature", async (req, reply) => {
      try {
        console.log("[Settings] GET /api/settings/sensors/temperature called");
        const sensors = await getAllTemperatureSensors();
        reply.send(sensors);
      } catch (error) {
        console.error("[Settings] Fel vid hämtning av temperatursensorer:", error);
        reply.code(500).send({ error: "Kunde inte hämta temperatursensorer" });
      }
    });

    // GET /api/settings/sensors/energy
    app.get("/api/settings/sensors/energy", async (req, reply) => {
      try {
        console.log("[Settings] GET /api/settings/sensors/energy called");
        const sensors = await getAllEnergySensors();
        reply.send(sensors);
      } catch (error) {
        console.error("[Settings] Fel vid hämtning av elförbrukning-sensorer:", error);
        reply.code(500).send({ error: "Kunde inte hämta elförbrukning-sensorer" });
      }
    });

    // PUT /api/settings/sensors/:deviceId/visibility
    app.put("/api/settings/sensors/:deviceId/visibility", async (req, reply) => {
      try {
        const { deviceId } = req.params as { deviceId: string };
        const { isVisible } = req.body as { isVisible: boolean };

        console.log(`[Settings] PUT /api/settings/sensors/${deviceId}/visibility called, isVisible=${isVisible}`);
        const updated = await updateSensorVisibility(deviceId, isVisible);
        reply.send(updated);
      } catch (error) {
        console.error("[Settings] Fel vid uppdatering av sensor-synlighet:", error);
        reply.code(500).send({ error: "Kunde inte uppdatera sensor-synlighet" });
      }
    });

    // PUT /api/settings/sensors/:deviceId/zone
    app.put("/api/settings/sensors/:deviceId/zone", async (req, reply) => {
      try {
        const { deviceId } = req.params as { deviceId: string };
        const { zone } = req.body as { zone: string };

        console.log(`[Settings] PUT /api/settings/sensors/${deviceId}/zone called, zone=${zone}`);
        
        // Validera zon: måste vara "INNE", "UTE", eller tom sträng
        if (!["INNE", "UTE", ""].includes(zone)) {
          return reply.code(400).send({ error: "Zon måste vara 'INNE', 'UTE', eller tom" });
        }

        const updated = await updateSensorZone(deviceId, zone);
        reply.send(updated);
      } catch (error) {
        console.error("[Settings] Fel vid uppdatering av sensor-zon:", error);
        reply.code(500).send({ error: "Kunde inte uppdatera sensor-zon" });
      }
    });

    console.log("[Settings] Settings-routes registrerade!");
  } catch (error) {
    console.error("[Settings] KRITISKT FEL vid registrering av routes:", error);
    throw error;
  }
}

