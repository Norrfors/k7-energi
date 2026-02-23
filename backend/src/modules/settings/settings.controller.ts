// Controller för inställningar och sensor-synlighet
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  getAllTemperatureSensors,
  getAllEnergySensors,
  updateSensorVisibility,
} from "./settings.service";

/**
 * GET /api/settings/sensors/temperature
 * Hämta alla temperatursensorer med visibility-status
 */
async function getTemperatureSensors(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const sensors = await getAllTemperatureSensors();
    reply.send(sensors);
  } catch (error) {
    reply.code(500).send({ error: "Kunde inte hämta temperatursensorer" });
  }
}

/**
 * GET /api/settings/sensors/energy
 * Hämta alla elförbrukning-sensorer med visibility-status
 */
async function getEnergySensors(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const sensors = await getAllEnergySensors();
    reply.send(sensors);
  } catch (error) {
    reply.code(500).send({ error: "Kunde inte hämta elförbrukning-sensorer" });
  }
}

/**
 * PUT /api/settings/sensors/:deviceId/visibility
 * Uppdatera visibility för en sensor
 */
async function updateSensorVisibilityHandler(
  req: FastifyRequest<{
    Params: { deviceId: string };
    Body: { isVisible: boolean };
  }>,
  reply: FastifyReply
) {
  try {
    const { deviceId } = req.params;
    const { isVisible } = req.body;

    const updated = await updateSensorVisibility(deviceId, isVisible);
    reply.send(updated);
  } catch (error) {
    reply.code(500).send({ error: "Kunde inte uppdatera sensor-synlighet" });
  }
}

/**
 * Registrera alla settings-rutter
 */
export async function settingsRoutes(app: FastifyInstance) {
  app.get("/api/settings/sensors/temperature", getTemperatureSensors);
  app.get("/api/settings/sensors/energy", getEnergySensors);
  app.put(
    "/api/settings/sensors/:deviceId/visibility",
    updateSensorVisibilityHandler
  );
}
