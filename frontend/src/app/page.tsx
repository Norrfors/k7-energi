"use client";

import { useEffect, useState } from "react";
import { getHealth, getTemperatures, getEnergy, getMeterLatest, getMeterToday, getMeterLast24Hours, setManualMeterValue, getBackupSettings, saveBackupSettings, performManualBackup, BackupSettings } from "@/lib/api";
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

  // Backup state
  const [backupSettings, setBackupSettingsState] = useState<BackupSettings | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupPerforming, setBackupPerforming] = useState(false);
  const [backupFolderPath, setBackupFolderPath] = useState<string>("");
  const [enableAutoBackup, setEnableAutoBackup] = useState(false);
  const [backupDay, setBackupDay] = useState("Monday");
  const [backupTime, setBackupTime] = useState("02:00");
  const [backupMessage, setBackupMessage] = useState<string>("");
  const [backupError, setBackupError] = useState<string>("");

  // Logga till console
  const log = (message: string, data?: unknown) => {
    console.log(`[Dashboard] ${message}`, data || "");
  };

  async function loadData() {
    try {
      log("Laddar data...");
      const healthData = await getHealth();
      setHealth(healthData);

      // Ladd temperaturer och energi (kan faila utan att blockera mätardata)
      try {
        const [tempData, energyData] = await Promise.all([
          getTemperatures(),
          getEnergy(),
        ]);
        setTemperatures(tempData);
        setEnergy(energyData);
        setHomeyConnected(true);
        log("Homey-data loadad framgångsrikt");
      } catch {
        setTemperatures([]);
        setEnergy([]);
        setHomeyConnected(false);
        log("Homey-data inte tillgänglig (timeout?)");
      }

      // Ladd mätardata separat (ska alltid fungera om DB är ansluten)
      try {
        const [meterData, meterHistoryData] = await Promise.all([
          getMeterLatest(),
          getMeterLast24Hours(),
        ]);
        setMeter(meterData);
        setMeterHistory(meterHistoryData);
        log("Mätardata loadad framgångsrikt");
      } catch (err) {
        log("Fel vid hämtning av mätardata", err);
        setMeter(null);
        setMeterHistory([]);
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

  // Ladda backup-inställningar när Settings-tabben blir aktiv
  useEffect(() => {
    if (activeTab !== "settings") return;

    const loadBackupSettings = async () => {
      try {
        setBackupLoading(true);
        const settings = await getBackupSettings();
        setBackupSettingsState(settings);
        setBackupFolderPath(settings.backupFolderPath);
        setEnableAutoBackup(settings.enableAutoBackup);
        setBackupDay(settings.backupDay);
        setBackupTime(settings.backupTime);
      } catch (err) {
        log("Fel vid hämtning av backup-inställningar", err);
        setBackupError("Kunde inte ladda backup-inställningar");
      } finally {
        setBackupLoading(false);
      }
    };

    loadBackupSettings();
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

  async function handleSaveBackupSettings() {
    try {
      setBackupLoading(true);
      setBackupError("");
      setBackupMessage("");

      await saveBackupSettings({
        backupFolderPath,
        enableAutoBackup,
        backupDay,
        backupTime,
      });

      setBackupMessage("Backup-inställningar sparade framgångsrikt");
      const updated = await getBackupSettings();
      setBackupSettingsState(updated);
    } catch (err) {
      setBackupError("Kunde inte spara backup-inställningar");
      log("Fel vid sparning av backup-inställningar", err);
    } finally {
      setBackupLoading(false);
    }
  }

  async function handleSelectBackupFolder() {
    try {
      setBackupError("");
      // Kontrollera om File System Access API är tillgängligt
      if (!('showDirectoryPicker' in window)) {
        setBackupError('Din webbläsare stöder inte mapputforskarning. Ange sökvägen manuellt.');
        return;
      }

      // Öppna mapputforskare
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });

      // Hämta en representativ sökväg från mappen
      // Note: Av säkerhetsskäl kan vi inte få full sökväg, men vi får mappen
      const path = dirHandle.name;
      
      // Vi sparar mappens namn som sökväg (rel eller abs)
      // För en riktig implementering skulle man kvitta med backend
      setBackupFolderPath(`./${path}`);
      setBackupMessage(`✓ Vald mapp: ${path}`);
    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        // Användaren avbröt
        return;
      }
      console.error('Fel vid mapputforskarning:', error);
      setBackupError('Kunde inte välja mapp. Försök igen eller ange sökvägen manuellt.');
    }
  }

  async function handlePerformBackup() {
    try {
      setBackupPerforming(true);
      setBackupError("");
      setBackupMessage("");

      const result = await performManualBackup();
      if (result.success) {
        setBackupMessage(`✓ Backup genomförd: ${result.filename}`);
        const updated = await getBackupSettings();
        setBackupSettingsState(updated);
      } else {
        setBackupError(result.message);
      }
    } catch (err) {
      setBackupError("Kunde inte utföra backup");
      log("Fel vid backup", err);
    } finally {
      setBackupPerforming(false);
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
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-blue-50 p-4 border-b border-gray-300 grid grid-cols-4 gap-4 font-semibold text-gray-700 text-sm">
                  <div>Enhet</div>
                  <div className="text-right">Aktuell</div>
                  <div className="text-right">Snitt 12h</div>
                  <div className="text-right">Snitt 24h</div>
                </div>
                {temperatures.map((t, index) => (
                  <div
                    key={t.deviceName}
                    className={`grid grid-cols-4 gap-4 p-4 ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } border-b border-gray-200 last:border-b-0 hover:bg-blue-100 transition`}
                  >
                    <div className="text-gray-800 font-medium">{t.deviceName}</div>
                    <div className="text-right font-semibold text-blue-600">
                      {t.temperature !== null ? `${t.temperature.toFixed(1)}°C` : "N/A"}
                    </div>
                    <div className="text-right text-gray-700">
                      {typeof t.temperature === "number" ? t.temperature.toFixed(1) : "N/A"}°C
                    </div>
                    <div className="text-right text-gray-700">
                      {typeof t.temperature === "number" ? t.temperature.toFixed(1) : "N/A"}°C
                    </div>
                  </div>
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

          <section>
            <h2 className="text-lg font-semibold mb-4">Databas Backup</h2>
            
            {/* Manuell Backup */}
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-6 mb-4">
              <h3 className="text-md font-medium text-gray-800 mb-3">Manuell Backup</h3>
              <button
                onClick={handlePerformBackup}
                disabled={backupPerforming}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
              >
                {backupPerforming ? "Kör backup..." : "Kör backup nu"}
              </button>

              {backupMessage && (
                <p className="text-green-600 text-sm mt-2">{backupMessage}</p>
              )}
              
              {backupSettings?.lastBackupAt && (
                <p className="text-xs text-gray-600 mt-2">
                  Senaste backup: {new Date(backupSettings.lastBackupAt).toLocaleString("sv-SE")}
                </p>
              )}
            </div>

            {/* Backup-inställningar */}
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
              <h3 className="text-md font-medium text-gray-800 mb-4">Automatisk Backup</h3>

              <div className="space-y-4">
                {/* Backup-mapp */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Backup-mapp (lokal sökväg)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={backupFolderPath}
                      onChange={(e) => setBackupFolderPath(e.target.value)}
                      placeholder="./backups"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={backupLoading}
                    />
                    <button
                      onClick={handleSelectBackupFolder}
                      disabled={backupLoading}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 transition whitespace-nowrap"
                      title="Välj mapp från filväljare"
                    >
                      📁 Bläddra
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Klicka "Bläddra" för att välja mapp, eller ange relativ/absolut sökväg på servern
                  </p>
                </div>

                {/* Aktivera automatisk backup */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enableAutoBackup"
                    checked={enableAutoBackup}
                    onChange={(e) => setEnableAutoBackup(e.target.checked)}
                    disabled={backupLoading}
                    className="w-4 h-4 rounded"
                  />
                  <label htmlFor="enableAutoBackup" className="text-sm font-medium text-gray-700">
                    Aktivera automatisk backup
                  </label>
                </div>

                {/* Dag och tid för automatisk backup */}
                {enableAutoBackup && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dag
                      </label>
                      <select
                        value={backupDay}
                        onChange={(e) => setBackupDay(e.target.value)}
                        disabled={backupLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option>Monday</option>
                        <option>Tuesday</option>
                        <option>Wednesday</option>
                        <option>Thursday</option>
                        <option>Friday</option>
                        <option>Saturday</option>
                        <option>Sunday</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tid (HH:MM)
                      </label>
                      <input
                        type="time"
                        value={backupTime}
                        onChange={(e) => setBackupTime(e.target.value)}
                        disabled={backupLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Spara-knapp */}
                <button
                  onClick={handleSaveBackupSettings}
                  disabled={backupLoading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition mt-4"
                >
                  {backupLoading ? "Sparar..." : "Spara backup-inställningar"}
                </button>

                {backupError && (
                  <p className="text-red-600 text-sm mt-2">{backupError}</p>
                )}
                {backupMessage && !backupPerforming && (
                  <p className="text-green-600 text-sm mt-2">{backupMessage}</p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
