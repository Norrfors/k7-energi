"use client";

import { useEffect, useState } from "react";
import { getHealth, getTemperatures, getEnergy, getMeterLatest, getMeterToday, getMeterLast24Hours, setManualMeterValue, getBackupSettings, saveBackupSettings, performManualBackup, BackupSettings, getTemperatureHistory, getEnergyHistory, getTemperatureSensors, getEnergySensors, updateSensorVisibility, updateSensorZone, SensorInfo } from "@/lib/api";
import { StatusCard } from "@/components/StatusCard";

interface Temperature {
  deviceName: string;
  temperature: number | null;
  zone?: string | null;
  avg12h?: number | null;
  avg24h?: number | null;
}

interface Energy {
  deviceName: string;
  watts: number | null;
  zone?: string | null;
  classification?: string | null;
  consumption1h?: number | null;
  consumption12h?: number | null;
  consumption24h?: number | null;
  consumptionToday?: number | null;
  consumptionPreviousDay?: number | null;
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
type SettingsTabType = "backup" | "temperature" | "energy";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTabType>("backup");
  const [health, setHealth] = useState<Health | null>(null);
  const [temperatures, setTemperatures] = useState<Temperature[]>([]);
  const [energy, setEnergy] = useState<Energy[]>([]);
  const [meter, setMeter] = useState<MeterReading | null>(null);
  const [meterHistory, setMeterHistory] = useState<MeterReading[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [homeyConnected, setHomeyConnected] = useState(false);
  const version = process.env.NEXT_PUBLIC_VERSION || "dev";
  
  // Sensor visibility state (localStorage-based)
  const [temperatureSensors, setTemperatureSensors] = useState<SensorInfo[]>([]);
  const [energySensors, setEnergySensors] = useState<SensorInfo[]>([]);
  const [sensorsLoading, setSensorsLoading] = useState(false);
  const [visibleTemperatures, setVisibleTemperatures] = useState<Set<string>>(new Set());
  const [visibleEnergy, setVisibleEnergy] = useState<Set<string>>(new Set());
  const [sensorLocations, setSensorLocations] = useState<Map<string, "INNE" | "UTE">>(new Map());
  const [tempListFilter, setTempListFilter] = useState<"INNE" | "UTE" | null>(null); // Filter för temperaturlistan
  const [zoneSavingDevices, setZoneSavingDevices] = useState<Set<string>>(new Set()); // Devicenavn som sparas för närvarande
  
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

  // Bestäm INNE/UTE-etikett baserat på deviceName
  const getLocationLabel = (deviceName: string): string => {
    const ute = ["ute", "utetemperatur", "utomhus", "exterior", "outside"];
    const inne = ["inne", "inomhus", "interior", "inside", "innetemperatur"];
    
    const lower = deviceName.toLowerCase();
    if (ute.some(u => lower.includes(u))) return "🌤️ UTE";
    if (inne.some(i => lower.includes(i))) return "🏠 INNE";
    return "📍 MÄTARE";
  };

  // localStorage helpers for sensor visibility
  const loadVisibleSensors = (): Set<string> => {
    if (typeof window === "undefined") return new Set();
    const stored = localStorage.getItem("visibleTemperatures");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  };

  const saveVisibleSensors = (visible: Set<string>) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("visibleTemperatures", JSON.stringify(Array.from(visible)));
  };

  // localStorage helpers for sensor locations (INNE/UTE)
  const loadSensorLocations = (): Map<string, "INNE" | "UTE"> => {
    if (typeof window === "undefined") return new Map();
    const stored = localStorage.getItem("sensorLocations");
    return stored ? new Map(JSON.parse(stored)) : new Map();
  };

  const saveSensorLocations = (locations: Map<string, "INNE" | "UTE">) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("sensorLocations", JSON.stringify(Array.from(locations.entries())));
  };

  const setSensorLocation = async (deviceName: string, location: "INNE" | "UTE") => {
    // Uppdatera localStorage lokalt
    const updated = new Map(sensorLocations);
    updated.set(deviceName, location);
    setSensorLocations(updated);
    saveSensorLocations(updated);

    // Hitta deviceId från temperatureSensors och spara till backend
    const sensor = temperatureSensors.find(s => s.deviceName === deviceName);
    if (sensor) {
      setZoneSavingDevices(prev => new Set(prev).add(deviceName));
      try {
        await updateSensorZone(sensor.deviceId, location);
        log(`Sparat zon för ${deviceName}: ${location}`);
      } catch (err) {
        log("Fel vid sparning av zon till backend", err);
        setSettingsError(`Kunde inte spara zon för ${deviceName}`);
      } finally {
        setZoneSavingDevices(prev => {
          const next = new Set(prev);
          next.delete(deviceName);
          return next;
        });
      }
    }
  };

  const getSensorLocation = (deviceName: string): "INNE" | "UTE" | null => {
    return sensorLocations.get(deviceName) || null;
  };

  // Toggle temperature sensor visibility
  const handleToggleTemperatureSensor = (deviceName: string) => {
    setVisibleTemperatures((prev) => {
      const updated = new Set(prev);
      if (updated.has(deviceName)) {
        updated.delete(deviceName);
      } else {
        updated.add(deviceName);
      }
      saveVisibleSensors(updated);
      return updated;
    });
  };

  // Bestäm INNE/UTE för en sensor - först sparad location, sedan fallback från namn
  const getEffectiveLocation = (deviceName: string): "INNE" | "UTE" | null => {
    const saved = getSensorLocation(deviceName);
    if (saved) return saved;
    
    // Fallback: klassificera baserat på deviceName
    const ute = ["ute", "utetemperatur", "utomhus", "exterior", "outside"];
    const inne = ["inne", "inomhus", "interior", "inside", "innetemperatur"];
    const lower = deviceName.toLowerCase();
    if (ute.some(u => lower.includes(u))) return "UTE";
    if (inne.some(i => lower.includes(i))) return "INNE";
    return null;
  };

  // Select all INNE sensors - just filter the list, don't affect dashboard visibility
  const selectAllInne = () => {
    // Ensure sensors are classified
    const updated = new Map(sensorLocations);
    temperatures.forEach(temp => {
      if (!updated.has(temp.deviceName) && temp.temperature !== null) {
        updated.set(temp.deviceName, temp.temperature < 10 ? "UTE" : "INNE");
      }
    });
    setSensorLocations(updated);
    saveSensorLocations(updated);
    
    // Just filter the list display to show only INNE sensors
    setTempListFilter("INNE");
  };

  // Select all UTE sensors - just filter the list, don't affect dashboard visibility
  const selectAllUte = () => {
    // Ensure sensors are classified
    const updated = new Map(sensorLocations);
    temperatures.forEach(temp => {
      if (!updated.has(temp.deviceName) && temp.temperature !== null) {
        updated.set(temp.deviceName, temp.temperature < 10 ? "UTE" : "INNE");
      }
    });
    setSensorLocations(updated);
    saveSensorLocations(updated);
    
    // Just filter the list display to show only UTE sensors
    setTempListFilter("UTE");
  };

  // Select all sensors
  const selectAllSensors = () => {
    setTempListFilter(null); // Show all sensors
  };

  // Auto-classify sensors based on temperature: <10°C = UTE, >=10°C = INNE
  const autoClassifySensors = () => {
    const updated = new Map(sensorLocations);
    temperatures.forEach(temp => {
      if (temp.temperature !== null) {
        // Under 10°C = UTE (typically outside temperatures in February)
        if (temp.temperature < 10) {
          updated.set(temp.deviceName, "UTE");
        } else {
          updated.set(temp.deviceName, "INNE");
        }
      }
    });
    setSensorLocations(updated);
    saveSensorLocations(updated);
  };

  // Beräkna medelvärder från temperaturhistorik
  const calculateAverages = (history: Array<{id: number; deviceName: string; temperature: number; createdAt: string}>, deviceName: string, hoursBack: number): number | null => {
    const now = Date.now();
    const timeLimit = now - hoursBack * 60 * 60 * 1000;
    const readings = history.filter(h => 
      h.deviceName === deviceName && 
      new Date(h.createdAt).getTime() >= timeLimit
    );
    if (readings.length === 0) return null;
    const sum = readings.reduce((acc, r) => acc + r.temperature, 0);
    return sum / readings.length;
  };

  // Beräkna förbrukningsmängd (Wh) från energihistorik
  const calculateConsumption = (history: Array<{deviceId: string; deviceName: string; watts: number; createdAt: string}>, deviceName: string, hoursBack: number): number | null => {
    const now = Date.now();
    const timeLimit = now - hoursBack * 60 * 60 * 1000;
    const readings = history.filter(h => 
      h.deviceName === deviceName && 
      new Date(h.createdAt).getTime() >= timeLimit
    );
    if (readings.length === 0) return null;
    // Beräkna genomsnittlig effekt × antal timmar
    const avgWatts = readings.reduce((acc, r) => acc + r.watts, 0) / readings.length;
    return Math.round(avgWatts * hoursBack * 100) / 100; // Wh-ekvivalent
  };
  
  // Beräkna förbrukning IDAG (från 00:00 till nu)
  // Använder meterPower om tillgängligt (MAX för idag), annars fallback till watts-baserad beräkning
  const calculateTodayConsumption = (history: Array<{deviceId: string; deviceName: string; watts: number; meterPower?: number; createdAt: string}>, deviceName: string): number | null => {
    const now = new Date();
    
    // Idag kl 00:00
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const readings = history.filter(h => 
      h.deviceName === deviceName && 
      new Date(h.createdAt).getTime() >= today.getTime()
    );
    if (readings.length === 0) return null;
    
    // Försök använd meterPower (Pulse-sensorns "consumption since midnight")
    const meterReadings = readings.filter(r => r.meterPower !== undefined && r.meterPower !== null);
    if (meterReadings.length > 0) {
      // meterPower är redan totalförbrukning sedan midnatt – ta bara senaste värde
      // Men multiplicera med 1000 för att konvertera från kWh till Wh
      const latestReading = meterReadings[meterReadings.length - 1];
      return Math.round((latestReading.meterPower || 0) * 1000 * 100) / 100;
    }
    
    // Fallback: Beräkna baserat på watts (genomsnittlig effekt × timmar som förflutit idag)
    const avgWatts = readings.reduce((acc, r) => acc + r.watts, 0) / readings.length;
    const hoursElapsed = (now.getTime() - today.getTime()) / (60 * 60 * 1000);
    return Math.round(avgWatts * hoursElapsed * 100) / 100;
  };
  
  // Beräkna förbrukning för föregående KALENDERDYGN (från 00:00 till 23:59:59 igår)
  // Använder meterPower om tillgängligt (MAX - MIN), annars fallback till watts-baserad beräkning
  const calculatePreviousDayConsumption = (history: Array<{deviceId: string; deviceName: string; watts: number; meterPower?: number; createdAt: string}>, deviceName: string): number | null => {
    const now = new Date();
    
    // Igårs start (00:00)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    // Igårs slut (23:59:59)
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);
    
    const readings = history.filter(h => 
      h.deviceName === deviceName && 
      new Date(h.createdAt).getTime() >= yesterday.getTime() &&
      new Date(h.createdAt).getTime() <= yesterdayEnd.getTime()
    );
    if (readings.length === 0) return null;
    
    // Försök använd meterPower (Pulse-sensorns "consumption since midnight")
    const meterReadings = readings.filter(r => r.meterPower !== undefined && r.meterPower !== null);
    if (meterReadings.length > 0) {
      // meterPower för igår = MAX - MIN (eftersom den återställs vid midnatt)
      // Då MAX är vid slutet av dagen och MIN vid början
      const maxMeter = Math.max(...meterReadings.map(r => r.meterPower || 0));
      const minMeter = Math.min(...meterReadings.map(r => r.meterPower || 0));
      // Resultat är i kWh, konvertera till Wh
      return Math.round((maxMeter - minMeter) * 1000 * 100) / 100;
    }
    
    // Fallback: Beräkna baserat på watts (genomsnittlig effekt × 24 timmar)
    const avgWatts = readings.reduce((acc, r) => acc + r.watts, 0) / readings.length;
    return Math.round(avgWatts * 24 * 100) / 100;
  };

  // Ladda synliga sensorer och sensorplatsmarkeringar från localStorage vid start
  useEffect(() => {
    const visible = loadVisibleSensors();
    setVisibleTemperatures(visible);
    const locations = loadSensorLocations();
    setSensorLocations(locations);
  }, []);

  async function loadData() {
    try {
      log("📡 Laddar data från backend (with auto-retry per API call)...");
      setLoading(true);
      setError("");
      const healthData = await getHealth();
      setHealth(healthData);
      log("✅ Health check passed");

      // Ladda temperaturer, energi och historia
      try {
        const [currentTemps, energyData, historyData, energyHistoryData] = await Promise.all([
          getTemperatures(),
          getEnergy(),
          getTemperatureHistory(24),
          getEnergyHistory(48), // Hämta 48h för att kunna beräkna föregående dygn
        ]);
        
        const tempsWithAverages = currentTemps.map(t => ({
          ...t,
          avg12h: calculateAverages(historyData, t.deviceName, 12),
          avg24h: calculateAverages(historyData, t.deviceName, 24),
        }));
        
        const energyWithConsumption = energyData.map(e => ({
          ...e,
          consumption1h: calculateConsumption(energyHistoryData, e.deviceName, 1),
          consumption12h: calculateConsumption(energyHistoryData, e.deviceName, 12),
          consumption24h: calculateConsumption(energyHistoryData, e.deviceName, 24),
          consumptionToday: calculateTodayConsumption(energyHistoryData, e.deviceName),
          consumptionPreviousDay: calculatePreviousDayConsumption(energyHistoryData, e.deviceName),
        }));
        
        setTemperatures(tempsWithAverages);
        setEnergy(energyWithConsumption);
        setHomeyConnected(true);
        log(`✅ Loaded ${currentTemps.length} temperatures, ${energyData.length} energy sensors`);
      } catch (err) {
        setTemperatures([]);
        setEnergy([]);
        setHomeyConnected(false);
        log("⚠️ Temperature/Energy failed (continuing)", err);
      }

      // Ladda sensorer separat
      try {
        const [tempSensors, engySensors] = await Promise.all([
          getTemperatureSensors(),
          getEnergySensors(),
        ]);
        setTemperatureSensors(tempSensors);
        setEnergySensors(engySensors);
        
        // Uppdatera sensorLocations från klassificeringen (INNE/UTE)
        const classificationsFromDB = new Map<string, "INNE" | "UTE">();
        tempSensors.forEach(sensor => {
          if (sensor.classification === "INNE" || sensor.classification === "UTE") {
            classificationsFromDB.set(sensor.deviceName, sensor.classification as "INNE" | "UTE");
          }
        });
        setSensorLocations(classificationsFromDB);
        saveSensorLocations(classificationsFromDB); // Spara också till localStorage
        
        log("✅ Sensors loaded with classifications from database");
      } catch (err) {
        log("⚠️ Sensors failed (using fallback)", err);
      }

      // Ladda mätardata separat
      try {
        const [meterData, meterHistoryData] = await Promise.all([
          getMeterLatest(),
          getMeterLast24Hours(),
        ]);
        setMeter(meterData);
        setMeterHistory(meterHistoryData);
        log("✅ Meter data loaded");
      } catch (err) {
        log("⚠️ Meter failed", err);
        setMeter(null);
        setMeterHistory([]);
      }
    } catch (err) {
      log("🔴 FAILED TO CONNECT - all retries exhausted", err);
      setError("Backend svarar inte. Kontrollera att servern körs på port 3001.");
    } finally {
      setLoading(false);
    }
  }

  // Manuell retry-knapp
  const handleRetry = () => {
    setLoading(true);
    setError("");
    loadData();
  }

  // Ladda data vid mount och auto-refresh var 60:e sekund (men INTE när man är i settings)
  useEffect(() => {
    loadData();
    
    // Uppdatera data var 60:e sekund, MEN BARA när man är INTE i inställningar
    if (activeTab === "settings") return;
    
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [activeTab]);

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
      
      // Gör att framgångsmeddelandet försvinner efter 3 sekunder
      setTimeout(() => setSettingsSuccess(""), 3000);
      
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
      // Gör att meddelandet försvinner efter 3 sekunder
      setTimeout(() => setBackupMessage(""), 3000);
      
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
    // Denna funktion är inaktiverad - användare bör skriva in sökvägen manuellt
    // Tidigare användes File System Access API som kräver "Allow"-klick
    setBackupMessage('Ange sökvägen direkt i textfältet (t.ex. "./backups" eller "C:\\backups")');
  }

  async function handlePerformBackup() {
    try {
      setBackupPerforming(true);
      setBackupError("");
      setBackupMessage("");

      const result = await performManualBackup();
      if (result.success) {
        setBackupMessage(`✓ Backup genomförd: ${result.filename}`);
        // Gör att meddelandet försvinner efter 4 sekunder
        setTimeout(() => setBackupMessage(""), 4000);
        
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

  // Ladda sensorer när Settings-tabben och rätt underflik blir aktiv
  useEffect(() => {
    if (activeTab !== "settings") return;

    const loadSensors = async () => {
      try {
        setSensorsLoading(true);
        const [temps, energies] = await Promise.all([
          getTemperatureSensors(),
          getEnergySensors(),
        ]);
        setTemperatureSensors(temps);
        setEnergySensors(energies);
      } catch (err) {
        log("Fel vid hämtning av sensorer", err);
      } finally {
        setSensorsLoading(false);
      }
    };

    loadSensors();
  }, [activeTab]);

  async function handleToggleSensorVisibility(deviceId: string, currentVisibility: boolean) {
    try {
      const newVisibility = !currentVisibility;
      await updateSensorVisibility(deviceId, newVisibility);
      
      // Uppdatera listan
      setTemperatureSensors(prev =>
        prev.map(s => s.deviceId === deviceId ? {...s, isVisible: newVisibility} : s)
      );
      setEnergySensors(prev =>
        prev.map(s => s.deviceId === deviceId ? {...s, isVisible: newVisibility} : s)
      );
      
      log(`Sensor ${deviceId} synlighet uppdaterad till ${newVisibility}`);
    } catch (err) {
      log("Fel vid uppdatering av sensor-synlighet", err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Laddar dashboard...</p>
          <p className="text-gray-400 text-sm mt-2">(med automatisk retry om backend inte svarar)</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Anslutningsfel</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500 mb-6">Backend-API svarat inte efter 20 försök (20 sekunder)</p>
          <button
            onClick={handleRetry}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
          >
            Försök igen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header med titel och version */}
      <div className="flex items-center justify-between pb-4 border-b-2 border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">K7 Energi Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Realtidsövervakning av hem och energiförbrukning</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-gray-400">Version</p>
          <p className="text-lg font-bold text-blue-600">{version}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-300 bg-gray-50 px-2 py-1 rounded-t-lg">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-2 font-semibold transition rounded-t-lg ${
            activeTab === "dashboard"
              ? "bg-white text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900 hover:bg-white"
          }`}
        >
          📊 Dashboard
        </button>
        <button
          onClick={() => setActiveTab("meter")}
          className={`px-4 py-2 font-semibold transition rounded-t-lg ${
            activeTab === "meter"
              ? "bg-white text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900 hover:bg-white"
          }`}
        >
          ⚡ Mätardata
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 font-semibold transition rounded-t-lg ml-auto flex items-center gap-2 ${
            activeTab === "settings"
              ? "bg-white text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900 hover:bg-white"
          }`}
        >
          ⚙️ Inställningar
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center gap-2">
              📱 System Status
            </h2>
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
              <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                🌡️ Temperaturer
              </h2>
              <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-blue-50 p-2 border-b border-gray-300 grid grid-cols-6 gap-1 font-semibold text-gray-700 text-xs">
                  <div className="col-span-3">Enhet / Zon</div>
                  <div className="text-right">Aktuell</div>
                  <div className="text-right">Snitt 12h</div>
                  <div className="text-right">Snitt 24h</div>
                </div>
                {temperatures
                  .sort((a, b) => a.deviceName.localeCompare(b.deviceName))
                  .filter(t => {
                    // Om användar inte ställt in något (tom set), visa alla
                    if (visibleTemperatures.size === 0) return true;
                    // Annars visa bara de som markerats som synliga
                    return visibleTemperatures.has(t.deviceName);
                  })
                  .map((t, index) => (
                  <div
                    key={t.deviceName}
                    className={`grid grid-cols-6 gap-1 p-2 ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } border-b border-gray-200 last:border-b-0 hover:bg-blue-100 transition text-xs`}
                  >
                    <div className="col-span-3 text-gray-800 font-medium truncate">
                      <div className="truncate">
                        {t.zone ? `${t.deviceName} / ${t.zone}` : t.deviceName}
                      </div>
                      <span className="text-gray-600">
                        {(() => {
                          const location = getSensorLocation(t.deviceName);
                          return location === "INNE" ? "🏠 INNE" : location === "UTE" ? "🌤️ UTE" : "";
                        })()}
                      </span>
                    </div>
                    <div className="text-right font-semibold text-blue-600">
                      {t.temperature !== null ? `${t.temperature.toFixed(1)}°` : "N/A"}
                    </div>
                    <div className="text-right text-gray-700">
                      {t.avg12h !== null && t.avg12h !== undefined ? `${t.avg12h.toFixed(1)}°` : "N/A"}
                    </div>
                    <div className="text-right text-gray-700">
                      {t.avg24h !== null && t.avg24h !== undefined ? `${t.avg24h.toFixed(1)}°` : "N/A"}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {energy.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                ⚡ Energiförbrukning
              </h2>
              <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-yellow-50 p-2 border-b border-gray-300 grid grid-cols-9 gap-1 font-semibold text-gray-700 text-xs">
                  <div className="col-span-2">Enhet / Zon</div>
                  <div className="text-right">Aktuell</div>
                  <div className="text-right">Senaste 1h</div>
                  <div className="text-right">Senaste 12h</div>
                  <div className="text-right">Senaste 24h</div>
                  <div className="text-right">Hittills idag</div>
                  <div className="text-right">Föregående dygn</div>
                </div>
                {energy
                  .sort((a, b) => a.deviceName.localeCompare(b.deviceName))
                  .filter(e => {
                    // Om ingen sensor-inställningar laddats ännu, visa alla (fallback)
                    if (energySensors.length === 0) return true;
                    const sensorSetting = energySensors.find(s => s.deviceName === e.deviceName);
                    // Om inget setting hittas, visa sensorn per default
                    return sensorSetting ? sensorSetting.isVisible : true;
                  })
                  .map((e, index) => {
                    const location = getSensorLocation(e.deviceName);
                    return (
                      <div
                        key={e.deviceName}
                        className={`grid grid-cols-9 gap-1 p-2 ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } border-b border-gray-200 last:border-b-0 hover:bg-yellow-100 transition text-xs`}
                      >
                        <div className="col-span-2 text-gray-800 font-medium truncate">
                          <div className="truncate">
                            {e.zone ? `${e.deviceName} / ${e.zone}` : e.deviceName}
                          </div>
                          <span className="text-gray-600">
                            {(() => {
                              return location === "INNE" ? "🏠 INNE" : location === "UTE" ? "🌤️ UTE" : "";
                            })()}
                          </span>
                        </div>
                        <div className="text-right font-semibold text-yellow-600">
                          {e.watts !== null ? `${e.watts.toFixed(0)}W` : "N/A"}
                        </div>
                        <div className="text-right text-gray-700">
                          {e.consumption1h !== null && e.consumption1h !== undefined ? `${e.consumption1h.toFixed(0)}Wh` : "N/A"}
                        </div>
                        <div className="text-right text-gray-700">
                          {e.consumption12h !== null && e.consumption12h !== undefined ? `${e.consumption12h.toFixed(0)}Wh` : "N/A"}
                        </div>
                        <div className="text-right text-gray-700">
                          {e.consumption24h !== null && e.consumption24h !== undefined ? `${e.consumption24h.toFixed(0)}Wh` : "N/A"}
                        </div>
                        <div className="text-right text-gray-700">
                          {e.consumptionToday !== null && e.consumptionToday !== undefined ? `${e.consumptionToday.toFixed(0)}Wh` : "N/A"}
                        </div>
                        <div className="text-right text-gray-700">
                          {e.consumptionPreviousDay !== null && e.consumptionPreviousDay !== undefined ? `${e.consumptionPreviousDay.toFixed(0)}Wh` : "N/A"}
                        </div>
                      </div>
                    );
                  })}}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Meter Tab */}
      {activeTab === "meter" && (
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center gap-2">
              ⚡ Mätardata
            </h2>
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
              <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                📈 Historik (idag)
              </h2>
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
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            ⚙️ Inställningar
          </h2>

          {/* Settings sous-tabs */}
          <div className="flex items-center gap-1 border-b border-gray-300 bg-gray-50 px-2 py-1 rounded-t-lg">
            <button
              onClick={() => setActiveSettingsTab("backup")}
              className={`px-4 py-2 font-semibold transition rounded-t-lg ${
                activeSettingsTab === "backup"
                  ? "bg-white text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white"
              }`}
            >
              💾 Backup
            </button>
            <button
              onClick={() => setActiveSettingsTab("temperature")}
              className={`px-4 py-2 font-semibold transition rounded-t-lg ${
                activeSettingsTab === "temperature"
                  ? "bg-white text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white"
              }`}
            >
              🌡️ Temperaturer
            </button>
            <button
              onClick={() => setActiveSettingsTab("energy")}
              className={`px-4 py-2 font-semibold transition rounded-t-lg ${
                activeSettingsTab === "energy"
                  ? "bg-white text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white"
              }`}
            >
              ⚡ El
            </button>
          </div>

          {/* BACKUP Tab */}
          {activeSettingsTab === "backup" && (
            <div className="space-y-6">
              {/* Manuell mätarställning */}
              <section>
                <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                  ⚙️ Mätardata
                </h3>
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
                  {settingsError && <p className="text-red-600 text-sm mt-2">{settingsError}</p>}
                  {settingsSuccess && <p className="text-green-600 text-sm mt-2">{settingsSuccess}</p>}
                  <p className="text-xs text-gray-500 mt-4">Ställ in den totala mätarställningen för energimätaren.</p>
                </div>
              </section>

              {/* Databas Backup */}
              <section>
                <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                  💾 Databas Backup
                </h3>
                
                {/* Manuell Backup */}
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-6 mb-4">
                  <h4 className="text-md font-medium text-gray-800 mb-3">Manuell Backup</h4>
                  <button
                    onClick={handlePerformBackup}
                    disabled={backupPerforming}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
                  >
                    {backupPerforming ? "Kör backup..." : "Kör backup nu"}
                  </button>
                  {backupMessage && <p className="text-green-600 text-sm mt-2">{backupMessage}</p>}
                  {backupSettings?.lastBackupAt && (
                    <p className="text-xs text-gray-600 mt-2">
                      Senaste backup: {new Date(backupSettings.lastBackupAt).toLocaleString("sv-SE")}
                    </p>
                  )}
                </div>

                {/* Automatisk Backup */}
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
                  <h4 className="text-md font-medium text-gray-800 mb-4">Automatisk Backup</h4>
                  <div className="space-y-4">
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
                        >
                          📁 Bläddra
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Ange sökväg på servern eller klicka Bläddra</p>
                    </div>

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

                    {enableAutoBackup && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Dag</label>
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">Tid (HH:MM)</label>
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

                    <button
                      onClick={handleSaveBackupSettings}
                      disabled={backupLoading}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition mt-4"
                    >
                      {backupLoading ? "Sparar..." : "Spara backup-inställningar"}
                    </button>

                    {backupError && <p className="text-red-600 text-sm mt-2">{backupError}</p>}
                    {backupMessage && !backupPerforming && (
                      <p className="text-green-600 text-sm mt-2">{backupMessage}</p>
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TEMPERATURE Tab */}
          {activeSettingsTab === "temperature" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Välj temperatursensorer att visa på Dashboard</h3>
              
              {/* Filter buttons */}
              {temperatures.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={selectAllSensors}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    Visa alla
                  </button>
                  <button
                    onClick={selectAllInne}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition"
                  >
                    Visa bara INNE 🏠
                  </button>
                  <button
                    onClick={selectAllUte}
                    className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 transition"
                  >
                    Visa bara UTE 🌤️
                  </button>
                  <button
                    onClick={autoClassifySensors}
                    className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition ml-auto"
                    title="Auto-classify: <10°C = UTE, ≥10°C = INNE"
                  >
                    🤖 Auto-klassificera
                  </button>
                </div>
              )}
              
              {temperatures.length > 0 ? (
                <div className="border border-gray-300 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  {/* Table header */}
                  <div className="grid grid-cols-10 gap-1 bg-blue-100 px-2 py-1 border-b border-gray-300 font-semibold text-xs text-gray-700 sticky top-0">
                    <div className="col-span-5">Sensor / Zon</div>
                    <div className="col-span-1 text-right">°C</div>
                    <div className="col-span-1 text-center">Visa</div>
                    <div className="col-span-1 text-center">INNE</div>
                    <div className="col-span-1 text-center">UTE</div>
                  </div>
                  
                  {/* Table rows */}
                  {temperatures
                    .sort((a, b) => a.deviceName.localeCompare(b.deviceName))
                    .filter(temp => {
                      // Apply list filter (INNE/UTE/null = all)
                      if (tempListFilter === null) return true;
                      const location = getSensorLocation(temp.deviceName);
                      // If sensor not classified, classify based on temp
                      if (!location && temp.temperature !== null) {
                        return tempListFilter === (temp.temperature < 10 ? "UTE" : "INNE");
                      }
                      return location === tempListFilter;
                    })
                    .map((temp, idx) => {
                    const isVisible = visibleTemperatures.size === 0 || visibleTemperatures.has(temp.deviceName);
                    const location = getSensorLocation(temp.deviceName);
                    return (
                      <div
                        key={temp.deviceName}
                        className={`grid grid-cols-10 gap-1 px-2 py-1 items-center text-xs bg-white border-b border-gray-200 last:border-b-0 hover:bg-blue-50 transition`}
                      >
                        {/* Sensornamn + ZONE + INNE/UTE */}
                        <div className="col-span-5 font-medium text-gray-900 truncate">
                          <span className="block truncate">
                            {temp.zone ? `${temp.deviceName} / ${temp.zone}` : temp.deviceName}
                          </span>
                          <span className={`text-xs font-normal ${
                            location === "INNE" ? "text-green-600" :
                            location === "UTE" ? "text-orange-600" :
                            "text-gray-500"
                          }`}>
                            {location === "INNE" ? "🏠" : location === "UTE" ? "🌤️" : "—"}
                          </span>
                        </div>
                        
                        {/* Aktuellt värde */}
                        <div className="col-span-1 text-right font-semibold text-blue-600">
                          {temp.temperature ? `${temp.temperature.toFixed(1)}` : "—"}
                        </div>
                        
                        {/* Checkbox - Visa på dashboard */}
                        <div className="col-span-1 flex justify-center">
                          <input
                            type="checkbox"
                            id={`temp-${temp.deviceName}`}
                            checked={isVisible}
                            onChange={() => handleToggleTemperatureSensor(temp.deviceName)}
                            className="w-3 h-3 rounded cursor-pointer"
                          />
                        </div>
                        
                        {/* Radio buttons - INNE och UTE */}
                        <div className="col-span-1 flex justify-center">
                          <label className="cursor-pointer opacity-75 hover:opacity-100 transition" title={zoneSavingDevices.has(temp.deviceName) ? "Sparar..." : ""}>
                            <input
                              type="radio"
                              name={`location-${temp.deviceName}`}
                              value="INNE"
                              checked={location === "INNE"}
                              onChange={() => setSensorLocation(temp.deviceName, "INNE")}
                              disabled={zoneSavingDevices.has(temp.deviceName)}
                              className="w-3 h-3 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </label>
                        </div>
                        
                        <div className="col-span-1 flex justify-center">
                          <label className="cursor-pointer opacity-75 hover:opacity-100 transition" title={zoneSavingDevices.has(temp.deviceName) ? "Sparar..." : ""}>
                            <input
                              type="radio"
                              name={`location-${temp.deviceName}`}
                              value="UTE"
                              checked={location === "UTE"}
                              onChange={() => setSensorLocation(temp.deviceName, "UTE")}
                              disabled={zoneSavingDevices.has(temp.deviceName)}
                              className="w-3 h-3 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </label>
                        </div>
                        
                        {zoneSavingDevices.has(temp.deviceName) && (
                          <div className="col-span-10 flex justify-center">
                            <span className="text-xs text-blue-600 font-semibold">Sparar...</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500">Laddar temperatursensorer...</p>
              )}
            </div>
          )}

          {/* ENERGY Tab */}
          {activeSettingsTab === "energy" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Välj elförbrukningssensorer att visa på Dashboard</h3>
              {sensorsLoading ? (
                <p className="text-gray-500">Laddar sensorer...</p>
              ) : energySensors.length > 0 ? (
                <div className="border border-gray-300 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  {/* Table header */}
                  <div className="grid grid-cols-10 gap-1 bg-yellow-100 px-2 py-1 border-b border-gray-300 font-semibold text-xs text-gray-700 sticky top-0">
                    <div className="col-span-5">Sensor / Zon</div>
                    <div className="col-span-2 text-center">Visa</div>
                    <div className="col-span-1 text-center">INNE</div>
                    <div className="col-span-1 text-center">UTE</div>
                  </div>
                  
                  {/* Table rows */}
                  {energySensors
                    .sort((a, b) => a.deviceName.localeCompare(b.deviceName))
                    .map((sensor, idx) => {
                      const location = getSensorLocation(sensor.deviceName);
                      return (
                        <div
                          key={sensor.deviceId}
                          className={`grid grid-cols-10 gap-1 px-2 py-1 items-center text-xs bg-white border-b border-gray-200 last:border-b-0 hover:bg-yellow-50 transition`}
                        >
                          {/* Sensornamn + ZONE + INNE/UTE */}
                          <div className="col-span-5 font-medium text-gray-900 truncate">
                            <span className="block truncate">
                              {sensor.zone ? `${sensor.deviceName} / ${sensor.zone}` : sensor.deviceName}
                            </span>
                            <span className={`text-xs font-normal ${
                              location === "INNE" ? "text-green-600" :
                              location === "UTE" ? "text-orange-600" :
                              "text-gray-500"
                            }`}>
                              {location === "INNE" ? "🏠" : location === "UTE" ? "🌤️" : "—"}
                            </span>
                          </div>
                          
                          {/* Checkbox - Visa på dashboard */}
                          <div className="col-span-2 flex justify-center">
                            <input
                              type="checkbox"
                              id={`energy-${sensor.deviceId}`}
                              checked={sensor.isVisible}
                              onChange={() => handleToggleSensorVisibility(sensor.deviceId, sensor.isVisible)}
                              className="w-3 h-3 rounded cursor-pointer"
                            />
                          </div>
                          
                          {/* Radio buttons - INNE och UTE */}
                          <div className="col-span-1 flex justify-center">
                            <label className="cursor-pointer opacity-75 hover:opacity-100 transition" title={zoneSavingDevices.has(sensor.deviceName) ? "Sparar..." : ""}>
                              <input
                                type="radio"
                                name={`location-energy-${sensor.deviceId}`}
                                value="INNE"
                                checked={location === "INNE"}
                                onChange={() => setSensorLocation(sensor.deviceName, "INNE")}
                                disabled={zoneSavingDevices.has(sensor.deviceName)}
                                className="w-3 h-3 cursor-pointer disabled:cursor-not-allowed"
                              />
                            </label>
                          </div>
                          
                          <div className="col-span-1 flex justify-center">
                            <label className="cursor-pointer opacity-75 hover:opacity-100 transition" title={zoneSavingDevices.has(sensor.deviceName) ? "Sparar..." : ""}>
                              <input
                                type="radio"
                                name={`location-energy-${sensor.deviceId}`}
                                value="UTE"
                                checked={location === "UTE"}
                                onChange={() => setSensorLocation(sensor.deviceName, "UTE")}
                                disabled={zoneSavingDevices.has(sensor.deviceName)}
                                className="w-3 h-3 cursor-pointer disabled:cursor-not-allowed"
                              />
                            </label>
                          </div>
                          
                          {zoneSavingDevices.has(sensor.deviceName) && (
                            <div className="col-span-10 flex justify-center">
                              <span className="text-xs text-blue-600 font-semibold">Sparar...</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-gray-500">Inga elförbrukningssensorer hittades</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
