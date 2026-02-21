"use client";

import { useEffect, useState } from "react";
import { getHealth, getTemperatures, getEnergy, getMeterLatest, getMeterToday, getMeterLast24Hours, setManualMeterValue } from "@/lib/api";
import { StatusCard } from "@/components/StatusCard";

interface Temperature {
  deviceName: string;
  temperature: number | null;
  zone: string;
}

interface Energy {
  deviceName: string;
  watts: number | null;
  zone: string;
}

interface Health {
  status: string;
  time: string;
  database: string;
}

interface MeterReading {
  consumptionSinceMidnight: number;
  consumptionSincePreviousReading?: number;
  totalMeterValue: number;
  lastUpdated?: string;
  time?: string;
}

type TabType = "dashboard" | "meter" | "settings";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [health, setHealth] = useState<Health | null>(null);
  const [temperatures, setTemperatures] = useState<Temperature[]>([]);
  const [energy, setEnergy] = useState<Energy[]>([]);
  const [meter, setMeter] = useState<MeterReading | null>(null);
  const [meterHistory, setMeterHistory] = useState<MeterReading[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [homeyConnected, setHomeyConnected] = useState(false);
  
  // Settings state
  const [manualMeterValue, setManualMeterValueInput] = useState<string>("");
  const [settingsMeterValue, setSettingsMeterValue] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string>("");
  const [settingsError, setSettingsError] = useState<string>("");

  // Logga till console
  const log = (message: string, data?: unknown) => {
    console.log(`[Dashboard] ${message}`, data || "");
  };

  async function loadData() {
    try {
      log("Laddar data...");
      const healthData = await getHealth();
      setHealth(healthData);

      try {
        const [tempData, energyData, meterData, meterHistoryData] = await Promise.all([
          getTemperatures(),
          getEnergy(),
          getMeterLatest(),
          getMeterLast24Hours(),
        ]);
        setTemperatures(tempData);
        setEnergy(energyData);
        setMeter(meterData);
        setMeterHistory(meterHistoryData);
        setHomeyConnected(true);
        log("Data loadad framgångsrikt");
      } catch {
        setHomeyConnected(false);
        log("Homey-data inte tillgänglig");
      }
    } catch (err) {
      setError("Kunde inte ansluta till backend. Kör den på port 3001?");
      log("Anslutningsfel", err);
    } finally {
      setLoading(false);
    }
  }

  // Ladda data vid mount
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh meter varje minut om meter-tab är aktiv
  useEffect(() => {
    if (activeTab !== "meter") return;

    const interval = setInterval(async () => {
      try {
        log("Uppdaterar mätardata (meter-tab)...");
        const meterData = await getMeterLatest();
        const meterHistoryData = await getMeterLast24Hours();
        setMeter(meterData);
        setMeterHistory(meterHistoryData);
      } catch (err) {
        log("Fel vid uppdatering av mätardata", err);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [activeTab]);

  async function handleSetManualMeter() {
    try {
      setSettingsMeterValue(true);
      setSettingsError("");
      setSettingsSuccess("");

      const value = parseFloat(manualMeterValue);
      if (isNaN(value) || value < 0) {
        setSettingsError("Ogiltigt värde");
        return;
      }

      log(`Ställer in manuell mätarställning: ${value}`);
      await setManualMeterValue(value);
      
      setSettingsSuccess(`Mätarställning inställd på ${value} kWh`);
      setManualMeterValueInput("");
      
      const meterData = await getMeterLatest();
      const meterHistoryData = await getMeterToday();
      setMeter(meterData);
      setMeterHistory(meterHistoryData);
    } catch (err) {
      setSettingsError("Kunde inte spara mätarställning");
      log("Fel vid inställning av mätarställning", err);
    } finally {
      setSettingsMeterValue(false);
    }
  }

  if (loading) {
    return <p className="text-gray-500">Laddar...</p>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-800">Anslutningsfel</h2>
        <p className="text-red-700 mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-300">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-2 font-semibold transition ${
            activeTab === "dashboard"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("meter")}
          className={`px-4 py-2 font-semibold transition ${
            activeTab === "meter"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Mätardata
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 font-semibold transition ml-auto flex items-center gap-2 ${
            activeTab === "settings"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          ⚙️ Inställningar
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold mb-3">System</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatusCard
                title="Backend"
                value={health?.status === "ok" ? "Online" : "Offline"}
                color={health?.status === "ok" ? "green" : "red"}
              />
              <StatusCard
                title="Databas"
                value={health?.database || "Okänd"}
                color={health?.database === "ansluten" ? "green" : "red"}
              />
              <StatusCard
                title="Homey Pro"
                value={homeyConnected ? "Ansluten" : "Ej ansluten"}
                color={homeyConnected ? "green" : "gray"}
              />
            </div>
          </section>

          {temperatures.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Temperaturer</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {temperatures.map((t) => (
                  <StatusCard
                    key={t.deviceName}
                    title={t.deviceName}
                    value={t.temperature !== null ? `${t.temperature}°C` : "N/A"}
                    color="blue"
                  />
                ))}
              </div>
            </section>
          )}

          {energy.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Energi</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {energy.map((e) => (
                  <StatusCard
                    key={e.deviceName}
                    title={e.deviceName}
                    value={e.watts !== null ? `${e.watts.toFixed(0)}W` : "N/A"}
                    color="yellow"
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Meter Tab */}
      {activeTab === "meter" && (
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold mb-3">Mätardata</h2>
            {meter ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatusCard
                  title="Förbrukning sedan midnatt"
                  value={`${meter.consumptionSinceMidnight.toFixed(2)} kWh`}
                  color="orange"
                />
                <StatusCard
                  title="Total mätarställning"
                  value={`${meter.totalMeterValue.toFixed(2)} kWh`}
                  color="green"
                />
              </div>
            ) : (
              <p className="text-gray-500">Ingen mätardata tillgänglig</p>
            )}
          </section>

          {meterHistory.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Historik (idag)</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 rounded-lg">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Tid</th>
                      <th className="px-4 py-2 text-left">Förbrukning sedan midnatt</th>
                      <th className="px-4 py-2 text-left">Förbrukning sedan föregående</th>
                      <th className="px-4 py-2 text-left">Total mätarställning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meterHistory.slice(-10).map((reading, idx) => (
                      <tr key={idx} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">
                          {new Date(reading.time || "").toLocaleTimeString("sv-SE")}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {reading.consumptionSinceMidnight.toFixed(2)} kWh
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {(reading.consumptionSincePreviousReading || 0).toFixed(2)} kWh
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {reading.totalMeterValue.toFixed(2)} kWh
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-4">Inställningar</h2>
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-6 max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Manuell mätarställning (kWh)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={manualMeterValue}
                  onChange={(e) => setManualMeterValueInput(e.target.value)}
                  placeholder="T.ex. 64161.21"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={settingsMeterValue}
                />
                <button
                  onClick={handleSetManualMeter}
                  disabled={settingsMeterValue || !manualMeterValue}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {settingsMeterValue ? "Sparar..." : "Spara"}
                </button>
              </div>

              {settingsError && (
                <p className="text-red-600 text-sm mt-2">{settingsError}</p>
              )}
              {settingsSuccess && (
                <p className="text-green-600 text-sm mt-2">{settingsSuccess}</p>
              )}

              <p className="text-xs text-gray-500 mt-4">
                Ställ in den totala mätarställningen för energimätaren.
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
