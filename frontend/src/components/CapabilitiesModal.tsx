// CapabilitiesModal.tsx – Modal för att välja vilka sensor-capabilities som ska loggas

import React, { useState, useEffect } from "react";
import {
  getSensorCapabilities,
  updateSensorCapabilities,
  SensorCapabilities,
} from "@/lib/api";

interface CapabilitiesModalProps {
  isOpen: boolean;
  deviceId: string;
  deviceName: string;
  onClose: () => void;
  onSave?: () => void;
}

export default function CapabilitiesModal({
  isOpen,
  deviceId,
  deviceName,
  onClose,
  onSave,
}: CapabilitiesModalProps) {
  const [capabilities, setCapabilities] = useState<SensorCapabilities | null>(
    null
  );
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hämta capabilities när modal öppnas
  useEffect(() => {
    if (isOpen && deviceId) {
      loadCapabilities();
    }
  }, [isOpen, deviceId]);

  const loadCapabilities = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSensorCapabilities(deviceId);
      setCapabilities(data);
      setSelectedCapabilities(data.capabilitiesToLog || []);
    } catch (err) {
      setError(`Kunde inte hämta capabilities: ${String(err)}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCapability = (capability: string) => {
    setSelectedCapabilities((prev) =>
      prev.includes(capability)
        ? prev.filter((c) => c !== capability)
        : [...prev, capability]
    );
  };

  const handleSave = async () => {
    if (!deviceId) return;

    try {
      setSaving(true);
      setError(null);
      await updateSensorCapabilities(deviceId, selectedCapabilities);
      onSave?.();
      onClose();
    } catch (err) {
      setError(`Kunde inte spara: ${String(err)}`);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">
          Dataloggar för {deviceName}
        </h2>

        {loading && <p className="text-gray-600">Laddar...</p>}

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        {capabilities && !loading && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Välj vilka värden som ska sparas i databasen:
            </p>

            <div className="space-y-3 rounded-md bg-gray-50 p-4">
              {capabilities.availableCapabilities.map((capability) => (
                <label
                  key={capability}
                  className="flex items-center space-x-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCapabilities.includes(capability)}
                    onChange={() => handleToggleCapability(capability)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="font-mono text-sm font-semibold">
                    {capability}
                  </span>
                  <span className="text-xs text-gray-500">
                    {getCapabilityDescription(capability)}
                  </span>
                </label>
              ))}
            </div>

            <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
              <strong>Tips:</strong> Fler värden = mer data i databasen. Börja
              med de viktigaste värdena.
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Sparar..." : "Spara"}
          </button>
        </div>
      </div>
    </div>
  );
}

function getCapabilityDescription(capability: string): string {
  const descriptions: Record<string, string> = {
    measure_power: "Aktuell effekt (W)",
    meter_power: "Energi sedan midnatt (kWh)",
    meter_value: "Total mätarställning (kWh)",
    accumulatedCost: "Kostnad sedan midnatt (kr)",
    measure_current: "Strömstyrka (A)",
    measure_voltage: "Spänning (V)",
    measure_temperature: "Temperatur (°C)",
    outdoorTemperature: "Utetemperatur (°C)",
    measure_humidity: "Luftfuktighet (%)",
  };
  return descriptions[capability] || capability;
}
