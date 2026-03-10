"use client";

import { useEffect, useState } from "react";
import { getHealth, getTemperatures, getEnergy, getMeterLatest, getMeterToday, getMeterLast24Hours, setManualMeterValue, getBackupSettings, saveBackupSettings, performManualBackup, BackupSettings, getTemperatureHistory, getEnergyHistory, getTemperatureSensors, getEnergySensors, updateSensorVisibility, updateSensorZone, SensorInfo, calibrateMeter, getCalibrationHistory, getEnergySettings, saveEnergySettings, EnergySettings, getDailyMeter, getWeeklyMeter, getMonthlyMeter, DailyMeter, WeeklyMeter, MonthlyMeter, getDbStats, DbStats, getTableData, TableData } from "@/lib/api";
import { StatusCard } from "@/components/StatusCard";
import CapabilitiesModal from "@/components/CapabilitiesModal";

interface Temperature {
  deviceName: string;
  temperature: number | null;
  zone?: string | null;
  zonePath?: string | null;
  avg12h?: number | null;
  avg24h?: number | null;
}

interface Energy {
  deviceName: string;
  watts: number | null;
  zone?: string | null;
  zonePath?: string | null;
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
  costSinceMidnight?: number;
  lastUpdated?: string;
  time?: string;
}

type TabType = "dashboard" | "meter" | "historik" | "settings" | "vira";
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

  // Elnätsinställningar state
  const [energySettings, setEnergySettings] = useState<EnergySettings | null>(null);
  const [energySettingsSaving, setEnergySettingsSaving] = useState(false);
  const [energySettingsMessage, setEnergySettingsMessage] = useState("");
  const [gridProvider, setGridProvider] = useState("Sundsvalls Elnät");
  const [gridFeePerKwh, setGridFeePerKwh] = useState("1.20");
  const [fuse, setFuse] = useState("20");
  const [annualConsumption, setAnnualConsumption] = useState("20000");

  // Historik state
  const [dailyMeter, setDailyMeter] = useState<DailyMeter[]>([]);
  const [weeklyMeter, setWeeklyMeter] = useState<WeeklyMeter[]>([]);
  const [monthlyMeter, setMonthlyMeter] = useState<MonthlyMeter[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<"dagar" | "veckor" | "manader">("dagar");

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

  // Databasstatus state
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [dbStatsLoading, setDbStatsLoading] = useState(false);
  const [selectedTableData, setSelectedTableData] = useState<TableData | null>(null);
  const [tableDataLoading, setTableDataLoading] = useState(false);
  const [dbTableTooltip, setDbTableTooltip] = useState<{ x: number; y: number; row: Record<string, unknown> } | null>(null);
  const [dbTableSort, setDbTableSort] = useState<{ col: string; dir: "asc" | "desc" } | null>(null);

  // Vira-schemaläggning
  type ViraSchedule = { rounds: number[][][]; seats: number[][][]; conflicts: number; conflictPlayers: Set<number>[][] };
  const [viraSchedule, setViraSchedule] = useState<ViraSchedule | null>(null);
  const [viraGenerating, setViraGenerating] = useState(false);
  const [viraSaving, setViraSaving] = useState(false);
  const [viraSaveMsg, setViraSaveMsg] = useState("");

  // Sensor detail modal state
  const [selectedSensor, setSelectedSensor] = useState<{ name: string; type: "temperature" | "energy" } | null>(null);
  const [historicalData, setHistoricalData] = useState<Array<{ deviceName: string; temperature?: number; watts?: number; meterPower?: number; accumulatedCost?: number; createdAt: string }>>([]);
  const [sensorModalPage, setSensorModalPage] = useState(1);
  const itemsPerPage = 100;

  // Mätarkalibrering – inline formulär
  const [calibValue, setCalibValue] = useState("");
  const [calibDate, setCalibDate] = useState(new Date().toLocaleDateString("sv-SE"));
  const [calibTime, setCalibTime] = useState(new Date().toTimeString().slice(0, 5));
  const [calibLoading, setCalibLoading] = useState(false);
  const [calibMessage, setCalibMessage] = useState("");
  const [calibHistory, setCalibHistory] = useState<{ calibrationValue: number; calibrationDateTime: string; savedAt: string }[]>([]);

  // Capabilities modal state
  const [capabilitiesModal, setCapabilitiesModal] = useState<{ isOpen: boolean; deviceId: string; deviceName: string } | null>(null);

  // Logga till console
  const log = (message: string, data?: unknown) => {
    console.log(`[Dashboard] ${message}`, data || "");
  };

  // Formaterar ett cellt värde i expanderad DB-tabell
  const formatDbCell = (colName: string, value: unknown): React.ReactNode => {
    if (value === null || value === undefined) return <span className="text-gray-300">—</span>;
    // Date-objekt från Prisma
    if (value instanceof Date) {
      return value.toLocaleString("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    }
    // ISO-datumsträngar
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
      }
    }
    // Talformatering
    if (typeof value === "number") {
      const colLower = colName.toLowerCase();
      if (["temperature", "mintemp", "maxtemp", "avgtemp"].some(t => colLower.includes(t))) {
        return value.toFixed(1);
      }
      if (Number.isInteger(value)) return String(value);
      return value.toFixed(2);
    }
    return String(value);
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

  // Vira – schemaläggning med lokal sökning (social golfer-problem: 32 deltagare, 8 bord à 4, 6 omgångar)
  const generateViraSchedule = () => {
    setViraGenerating(true);
    setViraSaveMsg("");
    setTimeout(() => {
      const ROUNDS = 6, TABLES = 8, PPT = 4, N = 32;
      // Uint8Array för O(1) par-lookup (spelare 1-32, index a*33+b)
      const met = new Uint8Array(33 * 33);
      const hasMet = (a: number, b: number) => met[a * 33 + b] === 1;
      const setMet = (a: number, b: number) => { met[a * 33 + b] = 1; met[b * 33 + a] = 1; };

      const shuffle = <T,>(arr: T[]): T[] => {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
          const j = (Math.random() * (i + 1)) | 0;
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      };

      const countConf = (round: number[][]): number => {
        let c = 0;
        for (const tbl of round)
          for (let i = 0; i < tbl.length; i++)
            for (let j = i + 1; j < tbl.length; j++)
              if (hasMet(tbl[i], tbl[j])) c++;
        return c;
      };

      // Lokal sökning: slumpmässiga byten av spelare mellan bord
      const localSearch = (round: number[][], iters: number): number => {
        let conf = countConf(round);
        for (let it = 0; it < iters && conf > 0; it++) {
          const t1 = (Math.random() * TABLES) | 0;
          const t2 = (Math.random() * TABLES) | 0;
          if (t1 === t2) continue;
          const p1i = (Math.random() * PPT) | 0;
          const p2i = (Math.random() * PPT) | 0;
          const p1 = round[t1][p1i], p2 = round[t2][p2i];
          let before = 0, after = 0;
          for (const p of round[t1]) { if (p !== p1) { if (hasMet(p1, p)) before++; if (hasMet(p2, p)) after++; } }
          for (const p of round[t2]) { if (p !== p2) { if (hasMet(p2, p)) before++; if (hasMet(p1, p)) after++; } }
          if (after <= before) { round[t1][p1i] = p2; round[t2][p2i] = p1; conf += after - before; }
        }
        return conf;
      };

      const rounds: number[][][] = [];
      const conflictPlayers: Set<number>[][] = [];
      let totalConflicts = 0;

      for (let r = 0; r < ROUNDS; r++) {
        const restarts = r < 2 ? 4 : r < 4 ? 15 : 35;
        const iters = r < 2 ? 60000 : r < 4 ? 120000 : 180000;
        let bestRound: number[][] = [];
        let bestConf = Infinity;

        for (let rs = 0; rs < restarts && bestConf > 0; rs++) {
          const players = shuffle(Array.from({ length: N }, (_, i) => i + 1));
          const round = Array.from({ length: TABLES }, (_, t) => [...players.slice(t * PPT, (t + 1) * PPT)]);
          const conf = localSearch(round, iters);
          if (conf < bestConf) { bestConf = conf; bestRound = round.map(t => [...t]); }
        }

        // Markera konflikterande spelare per bord
        const cp: Set<number>[] = Array.from({ length: TABLES }, () => new Set<number>());
        for (let t = 0; t < TABLES; t++)
          for (let i = 0; i < PPT; i++)
            for (let j = i + 1; j < PPT; j++)
              if (hasMet(bestRound[t][i], bestRound[t][j])) { cp[t].add(bestRound[t][i]); cp[t].add(bestRound[t][j]); }

        totalConflicts += bestConf === Infinity ? 0 : bestConf;
        for (const tbl of bestRound) for (let i = 0; i < tbl.length; i++) for (let j = i + 1; j < tbl.length; j++) setMet(tbl[i], tbl[j]);
        rounds.push(bestRound);
        conflictPlayers.push(cp);
      }
      // Tilldela sittplatser (NORD=0, OST=1, SYD=2, VÄST=3) balanserat över alla omgångar
      const PERMS4: number[][] = [
        [0,1,2,3],[0,1,3,2],[0,2,1,3],[0,2,3,1],[0,3,1,2],[0,3,2,1],
        [1,0,2,3],[1,0,3,2],[1,2,0,3],[1,2,3,0],[1,3,0,2],[1,3,2,0],
        [2,0,1,3],[2,0,3,1],[2,1,0,3],[2,1,3,0],[2,3,0,1],[2,3,1,0],
        [3,0,1,2],[3,0,2,1],[3,1,0,2],[3,1,2,0],[3,2,0,1],[3,2,1,0],
      ];
      const posCount = Array.from({ length: 33 }, () => new Array(4).fill(0));
      const seats: number[][][] = [];
      for (const round of rounds) {
        const roundSeats: number[][] = [];
        for (const table of round) {
          let bestPerm = PERMS4[0], bestScore = Infinity;
          for (const perm of PERMS4) {
            const score = table.reduce((s, p, i) => s + posCount[p][perm[i]], 0);
            if (score < bestScore) { bestScore = score; bestPerm = perm; }
          }
          const seatArr = new Array(4);
          table.forEach((p, i) => { seatArr[bestPerm[i]] = p; posCount[p][bestPerm[i]]++; });
          roundSeats.push(seatArr);
        }
        seats.push(roundSeats);
      }

      setViraSchedule({ rounds, seats, conflicts: totalConflicts, conflictPlayers });
      setViraGenerating(false);
    }, 10);
  };

  // Vira – generera HTML för utskrift/PDF
  const buildViraHtml = (rounds: number[][][], seats: number[][][], conflictPlayers: Set<number>[][]): string => {
    const now = new Date().toLocaleString("sv-SE");
    const posLabels = ["NORD", "OST", "SYD", "VÄST"];
    const rows = rounds.map((round, ri) => {
      const cells = round.map((tbl, ti) => {
        const rows4 = posLabels.map((pos, pi) => {
          const p = seats[ri][ti][pi];
          const red = conflictPlayers[ri]?.[ti]?.has(p);
          const chipStyle = red
            ? "display:inline-flex;width:22px;height:22px;align-items:center;justify-content:center;border-radius:50%;font-size:10px;font-weight:bold;background:#fee2e2;color:#b91c1c;border:2px solid #ef4444;"
            : "display:inline-flex;width:22px;height:22px;align-items:center;justify-content:center;border-radius:50%;font-size:10px;font-weight:bold;background:#dbeafe;color:#1e40af;";
          return `<div style="display:flex;align-items:center;gap:4px;margin:1px 0;"><span style="font-size:9px;color:#9ca3af;width:30px;text-align:right;">${pos}:</span><span style="${chipStyle}">${p}</span></div>`;
        }).join("");
        return `<td style="padding:4px 6px;border:1px solid #e5e7eb;">${rows4}</td>`;
      }).join("");
      const bg = ri % 2 === 0 ? "#ffffff" : "#eff6ff";
      return `<tr style="background:${bg}"><td style="padding:6px 10px;font-weight:bold;color:#1e40af;border:1px solid #e5e7eb;white-space:nowrap;vertical-align:top;">Omgång ${ri + 1}</td>${cells}</tr>`;
    }).join("");
    const headers = Array.from({ length: 8 }, (_, i) => `<th style="padding:8px;background:#2563eb;color:white;font-weight:600;">Bord ${i + 1}</th>`).join("");
    return `<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><title>Vira – Bordslottning</title>
<style>body{font-family:Arial,sans-serif;padding:20px;}h1{color:#1e3a8a;margin-bottom:8px;}table{border-collapse:collapse;width:100%;}@media print{body{padding:10px;}}</style>
</head><body>
<h1>🃏 Vira – Bordslottning</h1>
<table><thead><tr><th style="padding:8px;background:#2563eb;color:white;font-weight:600;text-align:left;">Omgång</th>${headers}</tr></thead><tbody>${rows}</tbody></table>
<p style="margin-top:30px;color:#6b7280;font-size:12px;text-align:right;">by Gaxor &nbsp;·&nbsp; ${now}</p>
</body></html>`;
  };

  const handleViraPrint = () => {
    if (!viraSchedule) return;
    const html = buildViraHtml(viraSchedule.rounds, viraSchedule.seats, viraSchedule.conflictPlayers);
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
  };

  const handleViraSave = async () => {
    if (!viraSchedule) return;
    setViraSaving(true);
    setViraSaveMsg("");
    try {
      const html = buildViraHtml(viraSchedule.rounds, viraSchedule.seats, viraSchedule.conflictPlayers);
      const res = await fetch("/api/vira/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      const data = await res.json();
      setViraSaveMsg(data.success ? `✅ Sparad: ${data.filename}` : "❌ Kunde inte spara");
    } catch { setViraSaveMsg("❌ Kunde inte spara"); }
    setViraSaving(false);
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

  // Get sensor location with fallback to temperature-based classification
  const getEffectiveSensorLocation = (deviceName: string, temperature: number | null): "INNE" | "UTE" | null => {
    const stored = getSensorLocation(deviceName);
    if (stored) return stored;
    // Fallback: classify based on temperature
    if (temperature !== null) {
      return temperature < 10 ? "UTE" : "INNE";
    }
    return null;
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

  async function loadData(initialLoad = false) {
    try {
      log("📡 Laddar data från backend (with auto-retry per API call)...");
      if (initialLoad) {
        setLoading(true);
        setError("");
      }
      const healthData = await getHealth();
      setHealth(healthData);
      log("✅ Health check passed");

      // Ladda temperaturer, energi och historia
      try {
        const [currentTemps, energyData, historyData, energyHistoryData] = await Promise.all([
          getTemperatures(),
          getEnergy(),
          getTemperatureHistory(72), // Hämta 72h för detaljer
          getEnergyHistory(72), // Hämta 72h för detaljer
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
        
        // Spara all historik för modal-visning
        setHistoricalData([...historyData, ...energyHistoryData]);
        
        setTemperatures(tempsWithAverages);
        setEnergy(energyWithConsumption);
        setHomeyConnected(true);
        log(`✅ Loaded ${currentTemps.length} temperatures, ${energyData.length} energy sensors`);
      } catch (err) {
        if (initialLoad) {
          setTemperatures([]);
          setEnergy([]);
        }
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
        if (initialLoad) {
          setMeter(null);
          setMeterHistory([]);
        }
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
    loadData(true);

    // Uppdatera data var 60:e sekund, MEN BARA när man är INTE i inställningar
    if (activeTab === "settings") return;

    const interval = setInterval(() => loadData(false), 60000);
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

  // Ladda backup- och energiinställningar när Settings-tabben blir aktiv
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

    const loadEnergySettings = async () => {
      try {
        const settings = await getEnergySettings();
        setEnergySettings(settings);
        setGridProvider(settings.gridProvider);
        setGridFeePerKwh(String(settings.gridFeePerKwh));
        setFuse(String(settings.fuse));
        setAnnualConsumption(String(settings.annualConsumption));
      } catch (err) {
        log("Fel vid hämtning av elnätsinställningar", err);
      }
    };

    const loadCalibHistory = async () => {
      try {
        const history = await getCalibrationHistory();
        setCalibHistory(history);
      } catch (err) {
        log("Fel vid hämtning av kalibreringshistorik", err);
      }
    };

    loadBackupSettings();
    loadEnergySettings();
    loadCalibHistory();
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

  async function handleSaveEnergySettings() {
    try {
      setEnergySettingsSaving(true);
      setEnergySettingsMessage("");
      const updated = await saveEnergySettings({
        gridProvider,
        gridFeePerKwh: parseFloat(gridFeePerKwh),
        fuse: parseInt(fuse),
        annualConsumption: parseInt(annualConsumption),
      });
      setEnergySettings(updated);
      setEnergySettingsMessage("✅ Inställningar sparade");
      setTimeout(() => setEnergySettingsMessage(""), 3000);
    } catch {
      setEnergySettingsMessage("❌ Kunde inte spara inställningar");
    } finally {
      setEnergySettingsSaving(false);
    }
  }

  async function handleCalibrateMeterInline() {
    const value = parseFloat(calibValue);
    if (isNaN(value) || value <= 0) {
      setCalibMessage("❌ Ogiltigt mätarvärde");
      return;
    }
    try {
      setCalibLoading(true);
      setCalibMessage("");
      // Konvertera lokal tid → UTC korrekt
      const dateUTC = new Date(`${calibDate}T${calibTime}:00`).toISOString();
      log(`Kalibrerar mätare: ${value} kWh @ ${dateUTC}`);
      const result = await calibrateMeter(value, dateUTC);
      if (result.success) {
        setCalibMessage(`✅ Kalibrering klar – ${result.updatedRecords} poster uppdaterade`);
        setCalibValue("");
        const [history, meterData] = await Promise.all([
          getCalibrationHistory(),
          getMeterLatest(),
        ]);
        setCalibHistory(history);
        setMeter(meterData);
      } else {
        setCalibMessage("❌ " + result.message);
      }
    } catch (err) {
      setCalibMessage("❌ Kalibrering misslyckades");
      log("Fel vid mätarkalibrering", err);
    } finally {
      setCalibLoading(false);
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

  // Ladda historikdata när Historik-tabben blir aktiv
  useEffect(() => {
    if (activeTab !== "historik") return;
    setHistoryLoading(true);
    Promise.all([
      getDailyMeter(60),
      getWeeklyMeter(24),
      getMonthlyMeter(36),
    ]).then(([daily, weekly, monthly]) => {
      setDailyMeter(daily);
      setWeeklyMeter(weekly);
      setMonthlyMeter(monthly);
    }).catch(() => {}).finally(() => setHistoryLoading(false));
  }, [activeTab]);

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
      {/* Flytande tooltip för DB-tabellvy */}
      {dbTableTooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 max-w-xs pointer-events-none"
          style={{ top: dbTableTooltip.y + 14, left: dbTableTooltip.x + 14 }}
        >
          {(["id", "deviceId", "zoneId", "zoneName", "zonePath"] as const).map(key => (
            dbTableTooltip.row[key] !== undefined && dbTableTooltip.row[key] !== null && (
              <div key={key} className="mb-1 last:mb-0">
                <span className="text-gray-400">{key}:</span>{" "}
                <span className="font-mono break-all">{String(dbTableTooltip.row[key])}</span>
              </div>
            )
          ))}
        </div>
      )}
      {/* Blinkande felruta – visas bara när något inte är anslutet */}
      {(health?.status !== "ok" || health?.database !== "ansluten" || !homeyConnected) && (
        <div className="animate-pulse bg-red-600 text-white font-bold text-center py-3 px-4 rounded-lg tracking-widest">
          {[
            health?.status !== "ok" && "BACKEND EJ ANSLUTET",
            health?.database !== "ansluten" && "DATABAS EJ ANSLUTET",
            !homeyConnected && "HOMEY PRO EJ ANSLUTET",
          ].filter(Boolean).join(" · ")}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-0.5 sm:gap-1 border-b border-gray-300 bg-gray-50 px-1 sm:px-2 py-1 rounded-t-lg overflow-x-auto">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-2 sm:px-4 py-2 text-sm sm:text-base font-semibold transition rounded-t-lg whitespace-nowrap ${
            activeTab === "dashboard"
              ? "bg-white text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900 hover:bg-white"
          }`}
        >
          📊 <span className="hidden xs:inline">Dashboard</span><span className="xs:hidden">Dash</span>
        </button>
        <button
          onClick={() => setActiveTab("meter")}
          className={`px-2 sm:px-4 py-2 text-sm sm:text-base font-semibold transition rounded-t-lg whitespace-nowrap ${
            activeTab === "meter"
              ? "bg-white text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900 hover:bg-white"
          }`}
        >
          ⚡ Mätare
        </button>
        <button
          onClick={() => setActiveTab("historik")}
          className={`px-2 sm:px-4 py-2 text-sm sm:text-base font-semibold transition rounded-t-lg whitespace-nowrap ${
            activeTab === "historik"
              ? "bg-white text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900 hover:bg-white"
          }`}
        >
          📅 Historik
        </button>
        <button
          onClick={() => setActiveTab("vira")}
          className={`px-2 sm:px-4 py-2 text-sm sm:text-base font-semibold transition rounded-t-lg whitespace-nowrap ${
            activeTab === "vira"
              ? "bg-white text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900 hover:bg-white"
          }`}
        >
          🃏 Vira
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-2 sm:px-4 py-2 text-sm sm:text-base font-semibold transition rounded-t-lg ml-auto flex items-center gap-1 sm:gap-2 whitespace-nowrap ${
            activeTab === "settings"
              ? "bg-white text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900 hover:bg-white"
          }`}
        >
          ⚙️ <span className="hidden sm:inline">Inställningar</span><span className="sm:hidden">Inst.</span>
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="space-y-8">
          {temperatures.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                🌡️ Temperaturer
              </h2>
              <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-blue-50 p-2 border-b border-gray-300 grid grid-cols-3 sm:grid-cols-7 gap-1 font-semibold text-gray-700 text-xs">
                  <div className="col-span-2">Enhet</div>
                  <div className="hidden sm:block sm:col-span-2">Zonestig</div>
                  <div className="text-right">Aktuell</div>
                  <div className="hidden sm:block text-right">Snitt 12h</div>
                  <div className="hidden sm:block text-right">Snitt 24h</div>
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
                    onClick={() => { setSelectedSensor({ name: t.deviceName, type: "temperature" }); setSensorModalPage(1); }}
                    className={`grid grid-cols-3 sm:grid-cols-7 gap-1 p-2 ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } border-b border-gray-200 last:border-b-0 active:bg-blue-100 hover:bg-blue-100 transition text-xs cursor-pointer`}
                  >
                    <div className="col-span-2 text-gray-800 font-medium truncate">
                      <div className="truncate">{t.deviceName}</div>
                      <span className="text-gray-600">
                        {(() => {
                          const location = getEffectiveSensorLocation(t.deviceName, t.temperature);
                          return location === "INNE" ? "🏠 INNE" : location === "UTE" ? "🌤️ UTE" : "";
                        })()}
                      </span>
                    </div>
                    <div className="hidden sm:block sm:col-span-2 text-gray-500 truncate self-center">
                      {t.zonePath || t.zone || ""}
                    </div>
                    <div className="text-right font-semibold text-blue-600 self-center">
                      {t.temperature !== null ? `${t.temperature.toFixed(1)}°` : "N/A"}
                    </div>
                    <div className="hidden sm:block text-right text-gray-700 self-center">
                      {t.avg12h !== null && t.avg12h !== undefined ? `${t.avg12h.toFixed(1)}°` : "N/A"}
                    </div>
                    <div className="hidden sm:block text-right text-gray-700 self-center">
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
                <div className="bg-yellow-50 p-2 border-b border-gray-300 grid grid-cols-3 sm:grid-cols-6 md:grid-cols-10 gap-1 font-semibold text-gray-700 text-xs">
                  <div className="col-span-2">Enhet</div>
                  <div className="hidden md:block md:col-span-2">Zonestig</div>
                  <div className="text-right">Aktuell</div>
                  <div className="hidden sm:block text-right">Senaste 1h</div>
                  <div className="hidden md:block text-right">Senaste 12h</div>
                  <div className="hidden md:block text-right">Senaste 24h</div>
                  <div className="hidden sm:block text-right">Idag</div>
                  <div className="hidden md:block text-right">Fg dygn</div>
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
                    const location = getEffectiveSensorLocation(e.deviceName, e.watts);
                    return (
                      <div
                        key={e.deviceName}
                        onClick={() => { setSelectedSensor({ name: e.deviceName, type: "energy" }); setSensorModalPage(1); }}
                        className={`grid grid-cols-3 sm:grid-cols-6 md:grid-cols-10 gap-1 p-2 ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } border-b border-gray-200 last:border-b-0 active:bg-yellow-100 hover:bg-yellow-100 transition text-xs cursor-pointer`}
                      >
                        <div className="col-span-2 text-gray-800 font-medium truncate">
                          <div className="truncate">{e.deviceName}</div>
                          <span className="text-gray-600">
                            {(() => {
                              return location === "INNE" ? "🏠 INNE" : location === "UTE" ? "🌤️ UTE" : "";
                            })()}
                          </span>
                        </div>
                        <div className="hidden md:block md:col-span-2 text-gray-500 truncate self-center">
                          {e.zonePath || e.zone || ""}
                        </div>
                        <div className="text-right font-semibold text-yellow-600 self-center">
                          {e.watts !== null ? `${e.watts.toFixed(0)}W` : "N/A"}
                        </div>
                        <div className="hidden sm:block text-right text-gray-700 self-center">
                          {e.consumption1h !== null && e.consumption1h !== undefined ? `${e.consumption1h.toFixed(0)}Wh` : "N/A"}
                        </div>
                        <div className="hidden md:block text-right text-gray-700 self-center">
                          {e.consumption12h !== null && e.consumption12h !== undefined ? `${e.consumption12h.toFixed(0)}Wh` : "N/A"}
                        </div>
                        <div className="hidden md:block text-right text-gray-700 self-center">
                          {e.consumption24h !== null && e.consumption24h !== undefined ? `${e.consumption24h.toFixed(0)}Wh` : "N/A"}
                        </div>
                        <div className="hidden sm:block text-right text-gray-700 self-center">
                          {e.consumptionToday !== null && e.consumptionToday !== undefined ? `${e.consumptionToday.toFixed(0)}Wh` : "N/A"}
                        </div>
                        <div className="hidden md:block text-right text-gray-700 self-center">
                          {e.consumptionPreviousDay !== null && e.consumptionPreviousDay !== undefined ? `${e.consumptionPreviousDay.toFixed(0)}Wh` : "0 Wh"}
                        </div>
                      </div>
                    );
                  })}
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
                      <th className="px-4 py-2 text-left">Förbrukn. idag (kWh)</th>
                      <th className="px-4 py-2 text-left">Δ sedan föreg. (kWh)</th>
                      <th className="px-4 py-2 text-left">Kostnad idag (kr)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meterHistory.slice(-10).map((reading, idx) => (
                      <tr key={idx} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">
                          {new Date(reading.time || "").toLocaleTimeString("sv-SE")}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {reading.consumptionSinceMidnight.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {(reading.consumptionSincePreviousReading || 0).toFixed(3)}
                        </td>
                        <td className="px-4 py-2 text-sm font-semibold text-green-600">
                          {(reading.costSinceMidnight || 0).toFixed(2)} kr
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

      {/* Historik Tab */}
      {activeTab === "historik" && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">📅 Historik – Elförbrukning</h2>
          <p className="text-sm text-gray-500">Aggregerat dygn för dygn. Rådatan sparas 45 dagar, dagliga sammanfattningar sparas för alltid.</p>

          {/* Underfliktnavigering */}
          <div className="flex gap-0.5 sm:gap-1 border-b border-gray-300 overflow-x-auto">
            {(["dagar", "veckor", "manader"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveHistoryTab(tab)}
                className={`px-3 sm:px-4 py-2 text-sm font-semibold transition rounded-t-lg whitespace-nowrap ${
                  activeHistoryTab === tab
                    ? "bg-white text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab === "dagar" ? "Dagar (60d)" : tab === "veckor" ? "Veckor (24v)" : "Månader"}
              </button>
            ))}
          </div>

          {historyLoading ? (
            <p className="text-gray-500 py-4">Laddar historikdata...</p>
          ) : (
            <>
              {/* DAGAR */}
              {activeHistoryTab === "dagar" && (
                <div className="border border-gray-300 rounded-lg overflow-hidden overflow-x-auto">
                  <table className="w-full text-xs min-w-[480px]">
                    <thead className="bg-blue-50 text-gray-700 font-semibold">
                      <tr>
                        <th className="text-left px-2 sm:px-3 py-2">Datum</th>
                        <th className="text-right px-2 sm:px-3 py-2">kWh</th>
                        <th className="text-right px-2 sm:px-3 py-2">Snitt W</th>
                        <th className="text-right px-2 sm:px-3 py-2">Topp W</th>
                        <th className="text-right px-2 sm:px-3 py-2">Mätare start</th>
                        <th className="text-right px-2 sm:px-3 py-2">Mätare slut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyMeter.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-6 text-gray-400">Ingen data ännu – aggregeras kl 01:00 varje natt</td></tr>
                      ) : (
                        [...dailyMeter].reverse().map((row, i) => (
                          <tr key={row.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-2 sm:px-3 py-1.5 font-medium">{new Date(row.date).toLocaleDateString("sv-SE", { weekday: "short", month: "short", day: "numeric" })}</td>
                            <td className="px-2 sm:px-3 py-1.5 text-right font-bold text-blue-700">{row.consumptionKwh.toFixed(2)}</td>
                            <td className="px-2 sm:px-3 py-1.5 text-right">{Math.round(row.avgWatts)}</td>
                            <td className="px-2 sm:px-3 py-1.5 text-right text-orange-600">{Math.round(row.peakWatts)}</td>
                            <td className="px-2 sm:px-3 py-1.5 text-right text-gray-400">{row.meterStart.toFixed(0)}</td>
                            <td className="px-2 sm:px-3 py-1.5 text-right text-gray-400">{row.meterEnd.toFixed(0)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {dailyMeter.length > 0 && (
                      <tfoot className="bg-gray-100 font-semibold text-xs border-t border-gray-300">
                        <tr>
                          <td className="px-2 sm:px-3 py-2">Totalt ({dailyMeter.length} dagar)</td>
                          <td className="px-2 sm:px-3 py-2 text-right text-blue-700">
                            {dailyMeter.reduce((s, r) => s + r.consumptionKwh, 0).toFixed(2)} kWh
                          </td>
                          <td colSpan={4}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              {/* VECKOR */}
              {activeHistoryTab === "veckor" && (
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-green-50 text-gray-700 font-semibold">
                      <tr>
                        <th className="text-left px-3 py-2">Vecka</th>
                        <th className="text-right px-3 py-2">Förbrukning kWh</th>
                        <th className="text-right px-3 py-2">Snitt W</th>
                        <th className="text-right px-3 py-2">Topp W</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyMeter.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-6 text-gray-400">Ingen veckodata ännu</td></tr>
                      ) : (
                        [...weeklyMeter].reverse().map((row, i) => (
                          <tr key={`${row.year}-${row.week}`} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-3 py-1.5 font-medium">v.{String(row.week).padStart(2, "0")} {row.year}</td>
                            <td className="px-3 py-1.5 text-right font-bold text-green-700">{Number(row.consumptionKwh).toFixed(2)}</td>
                            <td className="px-3 py-1.5 text-right">{Math.round(Number(row.avgWatts))}</td>
                            <td className="px-3 py-1.5 text-right text-orange-600">{Math.round(Number(row.peakWatts))}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* MÅNADER */}
              {activeHistoryTab === "manader" && (
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-purple-50 text-gray-700 font-semibold">
                      <tr>
                        <th className="text-left px-3 py-2">Månad</th>
                        <th className="text-right px-3 py-2">Förbrukning kWh</th>
                        <th className="text-right px-3 py-2">Snitt W</th>
                        <th className="text-right px-3 py-2">Topp W</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyMeter.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-6 text-gray-400">Ingen månadsdata ännu</td></tr>
                      ) : (
                        [...monthlyMeter].reverse().map((row, i) => {
                          const monthName = new Date(row.year, row.month - 1, 1).toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
                          return (
                            <tr key={`${row.year}-${row.month}`} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="px-3 py-1.5 font-medium capitalize">{monthName}</td>
                              <td className="px-3 py-1.5 text-right font-bold text-purple-700">{Number(row.consumptionKwh).toFixed(2)}</td>
                              <td className="px-3 py-1.5 text-right">{Math.round(Number(row.avgWatts))}</td>
                              <td className="px-3 py-1.5 text-right text-orange-600">{Math.round(Number(row.peakWatts))}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
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
          <div className="flex items-center gap-0.5 sm:gap-1 border-b border-gray-300 bg-gray-50 px-1 sm:px-2 py-1 rounded-t-lg overflow-x-auto">
            <button
              onClick={() => setActiveSettingsTab("backup")}
              className={`px-2 sm:px-4 py-2 text-sm sm:text-base font-semibold transition rounded-t-lg whitespace-nowrap ${
                activeSettingsTab === "backup"
                  ? "bg-white text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white"
              }`}
            >
              💾 Backup
            </button>
            <button
              onClick={() => setActiveSettingsTab("temperature")}
              className={`px-2 sm:px-4 py-2 text-sm sm:text-base font-semibold transition rounded-t-lg whitespace-nowrap ${
                activeSettingsTab === "temperature"
                  ? "bg-white text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white"
              }`}
            >
              🌡️ <span className="hidden sm:inline">Temperaturer</span><span className="sm:hidden">Temp.</span>
            </button>
            <button
              onClick={() => setActiveSettingsTab("energy")}
              className={`px-2 sm:px-4 py-2 text-sm sm:text-base font-semibold transition rounded-t-lg whitespace-nowrap ${
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

              {/* Databasstatus */}
              <section>
                <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                  🗄️ Databasstatus
                </h3>
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 sm:p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <button
                      onClick={async () => {
                        setDbStatsLoading(true);
                        try { setDbStats(await getDbStats()); } catch {}
                        setDbStatsLoading(false);
                      }}
                      disabled={dbStatsLoading}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition"
                    >
                      {dbStatsLoading ? "Hämtar..." : "🔍 Visa databasstatus"}
                    </button>
                    {dbStats && (
                      <span className="text-sm font-semibold text-gray-700">
                        Totalt: <span className="text-indigo-700">{dbStats.totalDb}</span>
                      </span>
                    )}
                  </div>

                  {dbStats && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs min-w-[400px]">
                        <thead>
                          <tr className="bg-indigo-50 text-gray-700 font-semibold">
                            <th className="text-left px-3 py-2">Tabell</th>
                            <th className="text-right px-3 py-2">Rader</th>
                            <th className="text-right px-3 py-2">Data</th>
                            <th className="text-right px-3 py-2">Index</th>
                            <th className="text-right px-3 py-2">Totalt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dbStats.tables.map((t, i) => (
                            <tr
                              key={t.tabell}
                              className={`cursor-pointer hover:bg-indigo-50 transition-colors ${selectedTableData?.tableName === t.tabell ? "bg-indigo-100" : i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                              onClick={async () => {
                                if (selectedTableData?.tableName === t.tabell) {
                                  setSelectedTableData(null);
                                  return;
                                }
                                setTableDataLoading(true);
                                try { setSelectedTableData(await getTableData(t.tabell)); } catch {}
                                setTableDataLoading(false);
                              }}
                            >
                              <td className="px-3 py-1.5 font-mono text-indigo-700 underline decoration-dotted">{t.tabell}</td>
                              <td className="px-3 py-1.5 text-right text-gray-600">{t.rader.toLocaleString("sv-SE")}</td>
                              <td className="px-3 py-1.5 text-right text-gray-500">{t.data}</td>
                              <td className="px-3 py-1.5 text-right text-gray-500">{t.index}</td>
                              <td className="px-3 py-1.5 text-right font-semibold text-indigo-700">{t.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Expanderad tabellvy */}
                  {tableDataLoading && (
                    <p className="mt-4 text-sm text-gray-500 italic">Hämtar tabelldata...</p>
                  )}
                  {selectedTableData && !tableDataLoading && (() => {
                    const isHidden = (col: string) => col === "id" || col.endsWith("Id");
                    const dateCols = ["createdAt", "updatedAt", "fetchedAt", "calibrationDateTime", "date", "lastBackupAt"];
                    const allCols = selectedTableData.rows.length > 0 ? Object.keys(selectedTableData.rows[0]) : [];
                    const rows = selectedTableData.rows;
                    // Dölj updatedAt om den aldrig skiljer sig från createdAt (Prisma sätter båda till now() vid insert)
                    const updatedAtRedundant = allCols.includes("updatedAt") && allCols.includes("createdAt") &&
                      rows.every(r => String(r["updatedAt"]) === String(r["createdAt"]));
                    const visible = allCols.filter(c => !isHidden(c) && !(c === "updatedAt" && updatedAtRedundant));
                    const cols = [
                      ...visible.filter(c => dateCols.includes(c)),
                      ...visible.filter(c => !dateCols.includes(c)),
                    ];
                    const sortedRows = dbTableSort ? [...rows].sort((a, b) => {
                      const av = a[dbTableSort.col], bv = b[dbTableSort.col];
                      if (av === null || av === undefined) return 1;
                      if (bv === null || bv === undefined) return -1;
                      const cmp = av instanceof Date && bv instanceof Date ? av.getTime() - bv.getTime()
                        : typeof av === "number" && typeof bv === "number" ? av - bv
                        : String(av).localeCompare(String(bv), "sv");
                      return dbTableSort.dir === "asc" ? cmp : -cmp;
                    }) : rows;
                    const handleSort = (col: string) => {
                      setDbTableSort(s => s?.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" });
                    };
                    return (
                      <div className="mt-4 border border-indigo-200 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between bg-indigo-600 text-white px-4 py-2">
                          <span className="font-mono font-semibold text-sm">{selectedTableData.tableName} – {selectedTableData.rows.length} rader (senaste först)</span>
                          <button onClick={() => { setSelectedTableData(null); setDbTableSort(null); }} className="text-white hover:text-indigo-200 text-lg font-bold leading-none">×</button>
                        </div>
                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                          <table className="w-full text-xs whitespace-nowrap">
                            <thead className="sticky top-0 bg-indigo-50 text-gray-700 font-semibold">
                              <tr>
                                {cols.map(c => (
                                  <th
                                    key={c}
                                    className="text-left px-3 py-2 border-b border-indigo-100 cursor-pointer hover:bg-indigo-100 select-none"
                                    onClick={() => handleSort(c)}
                                  >
                                    {c}
                                    {dbTableSort?.col === c ? (dbTableSort.dir === "asc" ? " ▲" : " ▼") : " ⇅"}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sortedRows.map((row, i) => (
                                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                  {cols.map(c => (
                                    <td
                                      key={c}
                                      className={`px-3 py-1 text-gray-700 border-b border-gray-100${c === "deviceName" ? " cursor-help underline decoration-dotted" : ""}`}
                                      onMouseEnter={c === "deviceName" ? (e) => setDbTableTooltip({ x: e.clientX, y: e.clientY, row }) : undefined}
                                      onMouseMove={c === "deviceName" ? (e) => setDbTableTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null) : undefined}
                                      onMouseLeave={c === "deviceName" ? () => setDbTableTooltip(null) : undefined}
                                    >
                                      {formatDbCell(c, row[c])}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
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
                    const location = getEffectiveSensorLocation(temp.deviceName, temp.temperature);
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
            <div className="space-y-6">
              {/* Manuell elmätaravläsning */}
              <section>
                <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                  ⚙️ Mätardata
                </h3>
                <div className="bg-blue-50 border border-blue-300 rounded-lg p-6 mb-4">
                  <h4 className="text-md font-medium text-gray-800 mb-1">📊 Manuell elmätaravläsning</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Läs av din elmätartavla och ange värdet med datum och tid. Alla historiska beräknade värden räknas om automatiskt.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Mätarställning (kWh)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={calibValue}
                        onChange={(e) => setCalibValue(e.target.value)}
                        placeholder="T.ex. 65099"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        disabled={calibLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Datum</label>
                      <input
                        type="date"
                        value={calibDate}
                        onChange={(e) => setCalibDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        disabled={calibLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Tid (lokal tid)</label>
                      <input
                        type="time"
                        value={calibTime}
                        onChange={(e) => setCalibTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        disabled={calibLoading}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleCalibrateMeterInline}
                    disabled={calibLoading || !calibValue}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-medium"
                  >
                    {calibLoading ? "Räknar om..." : "🔧 Spara avläsning"}
                  </button>
                  {calibMessage && (
                    <p className={`text-sm mt-3 ${calibMessage.startsWith("✅") ? "text-green-700" : "text-red-600"}`}>
                      {calibMessage}
                    </p>
                  )}
                  {calibHistory.length > 0 && (
                    <div className="mt-5 border-t border-blue-200 pt-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Tidigare avläsningar</h5>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-gray-500 border-b border-blue-200">
                            <th className="pb-1 pr-4">Datum & tid</th>
                            <th className="pb-1 text-right">Mätarställning</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calibHistory
                            .slice()
                            .sort((a, b) => new Date(b.calibrationDateTime).getTime() - new Date(a.calibrationDateTime).getTime())
                            .map((c) => (
                              <tr key={c.calibrationDateTime} className="border-b border-blue-100 last:border-0">
                                <td className="py-1 pr-4 text-gray-700">
                                  {new Date(c.calibrationDateTime).toLocaleString("sv-SE", {
                                    year: "numeric", month: "2-digit", day: "2-digit",
                                    hour: "2-digit", minute: "2-digit",
                                  })}
                                </td>
                                <td className="py-1 text-right font-mono text-gray-800">
                                  {c.calibrationValue.toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kWh
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>

              {/* Elnätsinställningar */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">⚡ Elnätsinställningar</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nätleverantör</label>
                    <input
                      type="text"
                      value={gridProvider}
                      onChange={(e) => setGridProvider(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nätavgift kr/kWh</label>
                    <input
                      type="number"
                      step="0.01"
                      value={gridFeePerKwh}
                      onChange={(e) => setGridFeePerKwh(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Säkring (A)</label>
                    <input
                      type="number"
                      value={fuse}
                      onChange={(e) => setFuse(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Årsförbrukning (kWh)</label>
                    <input
                      type="number"
                      value={annualConsumption}
                      onChange={(e) => setAnnualConsumption(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={handleSaveEnergySettings}
                    disabled={energySettingsSaving}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {energySettingsSaving ? "Sparar..." : "Spara inställningar"}
                  </button>
                  {energySettingsMessage && (
                    <span className="text-sm">{energySettingsMessage}</span>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900">Välj elförbrukningssensorer att visa på Dashboard</h3>
              {sensorsLoading ? (
                <p className="text-gray-500">Laddar sensorer...</p>
              ) : energySensors.length > 0 ? (
                <div className="border border-gray-300 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  {/* Table header */}
                  <div className="grid grid-cols-12 gap-1 bg-yellow-100 px-2 py-1 border-b border-gray-300 font-semibold text-xs text-gray-700 sticky top-0">
                    <div className="col-span-4">Sensor / Zon</div>
                    <div className="col-span-2 text-center">Visa</div>
                    <div className="col-span-1 text-center">INNE</div>
                    <div className="col-span-1 text-center">UTE</div>
                    <div className="col-span-2 text-center">Inställningar</div>
                  </div>
                  
                  {/* Table rows */}
                  {energySensors
                    .sort((a, b) => a.deviceName.localeCompare(b.deviceName))
                    .map((sensor, idx) => {
                      const location = getEffectiveSensorLocation(sensor.deviceName, null);
                      return (
                        <div
                          key={sensor.deviceId}
                          className={`grid grid-cols-12 gap-1 px-2 py-1 items-center text-xs bg-white border-b border-gray-200 last:border-b-0 hover:bg-yellow-50 transition`}
                        >
                          {/* Sensornamn + ZONE + INNE/UTE */}
                          <div className="col-span-4 font-medium text-gray-900 truncate">
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
                          
                          {/* Radio buttons - INNE og UTE */}
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

                          {/* Settings button */}
                          <div className="col-span-2 flex justify-center">
                            <button
                              onClick={() => setCapabilitiesModal({ isOpen: true, deviceId: sensor.deviceId, deviceName: sensor.deviceName })}
                              className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition"
                              title="Konfigurerar vilka värden Som ska loggas"
                            >
                              ⚙️ Datalogg
                            </button>
                          </div>
                          
                          {zoneSavingDevices.has(sensor.deviceName) && (
                            <div className="col-span-12 flex justify-center">
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
      {/* Sensor Detail Modal */}
      {selectedSensor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gray-100 border-b border-gray-300 p-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedSensor.type === "temperature" ? "🌡️" : "⚡"} {selectedSensor.name}
              </h2>
              <button
                onClick={() => setSelectedSensor(null)}
                className="text-gray-600 hover:text-gray-900 font-bold text-xl"
              >
                ✕
              </button>
            </div>

            {/* Historik-tabell */}
            <div className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300">
                      <th className="border border-gray-300 p-2 text-left">Tid</th>
                      {selectedSensor.type === "temperature" ? (
                        <th className="border border-gray-300 p-2 text-right">Temperatur (°C)</th>
                      ) : (
                        <>
                          <th className="border border-gray-300 p-2 text-right">Effekt (W)</th>
                          <th className="border border-gray-300 p-2 text-right">Mätare (kWh)</th>
                          <th className="border border-gray-300 p-2 text-right">Kostnad (kr)</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredData = historicalData
                        .filter(h => h.deviceName === selectedSensor.name)
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                      
                      const totalPages = Math.ceil(filteredData.length / itemsPerPage);
                      const startIdx = (sensorModalPage - 1) * itemsPerPage;
                      const endIdx = startIdx + itemsPerPage;
                      const pageData = filteredData.slice(startIdx, endIdx);
                      
                      return pageData.map((h, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="border border-gray-300 p-2">
                            {new Date(h.createdAt).toLocaleString("sv-SE")}
                          </td>
                          {selectedSensor.type === "temperature" ? (
                            <td className="border border-gray-300 p-2 text-right">
                              {h.temperature != null ? h.temperature.toFixed(2) : "—"}
                            </td>
                          ) : (
                            <>
                              <td className="border border-gray-300 p-2 text-right">
                                {h.watts != null ? h.watts.toFixed(0) : "—"}
                              </td>
                              <td className="border border-gray-300 p-2 text-right">
                                {h.meterPower != null ? h.meterPower.toFixed(2) : "—"}
                              </td>
                              <td className="border border-gray-300 p-2 text-right">
                                {h.accumulatedCost != null ? h.accumulatedCost.toFixed(2) : "—"}
                              </td>
                            </>
                          )}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {(() => {
                const filteredData = historicalData.filter(h => h.deviceName === selectedSensor.name);
                const totalPages = Math.ceil(filteredData.length / itemsPerPage);
                
                return (
                  <div className="mt-4 flex justify-between items-center">
                    <button
                      onClick={() => setSensorModalPage(p => Math.max(1, p - 1))}
                      disabled={sensorModalPage === 1}
                      className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50 text-sm"
                    >
                      ← Tidigare
                    </button>
                    
                    <span className="text-sm text-gray-600">
                      Sida {sensorModalPage} av {totalPages} ({filteredData.length} rader)
                    </span>
                    
                    <button
                      onClick={() => setSensorModalPage(p => Math.min(totalPages, p + 1))}
                      disabled={sensorModalPage === totalPages}
                      className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50 text-sm"
                    >
                      Nästa →
                    </button>
                  </div>
                );
              })()}
              
              {historicalData.filter(h => h.deviceName === selectedSensor.name).length === 0 && (
                <p className="text-gray-500 text-center py-4">Ingen historik tillgänglig för denna sensor</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIRA Tab */}
      {activeTab === "vira" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-900">🃏 Vira – Bordslottning</h2>
            <button onClick={generateViraSchedule} disabled={viraGenerating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-semibold">
              {viraGenerating ? "Genererar..." : viraSchedule ? "🔀 Generera nytt" : "🎲 Generera schema"}
            </button>
            {viraSchedule && (
              <>
                <button onClick={handleViraPrint}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition font-semibold">
                  🖨️ Skriv ut / PDF
                </button>
                <button onClick={handleViraSave} disabled={viraSaving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition font-semibold">
                  {viraSaving ? "Sparar..." : "💾 Spara till .\Vira"}
                </button>
              </>
            )}
            {viraSaveMsg && <span className="text-sm font-medium">{viraSaveMsg}</span>}
            {viraSchedule && viraSchedule.conflicts > 0 && (
              <span className="text-sm text-amber-700 bg-amber-100 px-3 py-1 rounded-full font-medium">
                ⚠️ {viraSchedule.conflicts} konflikt{viraSchedule.conflicts > 1 ? "er" : ""} – röd ring = upprepat par
              </span>
            )}
            {viraSchedule && viraSchedule.conflicts === 0 && (
              <span className="text-sm text-green-700 bg-green-100 px-3 py-1 rounded-full font-medium">
                ✅ Inga upprepade bordskamrater
              </span>
            )}
          </div>

          <p className="text-sm text-gray-500">
            32 deltagare (1–32) fördelas på 8 bord à 4 per omgång. Ingen ska sitta med samma person som en tidigare omgång.
          </p>

          {viraSchedule && (
            <div className="overflow-x-auto">
              <table className="text-sm border-collapse min-w-full">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Omgång</th>
                    {Array.from({ length: 8 }, (_, i) => (
                      <th key={i} className="px-3 py-2 text-center font-semibold whitespace-nowrap">Bord {i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {viraSchedule.rounds.map((round, ri) => (
                    <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-blue-50"}>
                      <td className="px-3 py-2 font-bold text-blue-800 whitespace-nowrap border-r border-blue-100">
                        Omgång {ri + 1}
                      </td>
                      {round.map((table, ti) => (
                        <td key={ti} className="px-1 py-1 border border-gray-100 text-xs">
                          {["NORD","OST","SYD","VÄST"].map((pos, pi) => {
                            const p = viraSchedule.seats[ri][ti][pi];
                            const conflict = viraSchedule.conflictPlayers[ri]?.[ti]?.has(p);
                            return (
                              <div key={pos} className="flex items-center gap-1 px-1 py-0.5">
                                <span className="text-gray-400 w-8 text-right shrink-0">{pos}:</span>
                                <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                                  conflict ? "bg-red-100 text-red-700 ring-2 ring-red-500" : "bg-blue-100 text-blue-800"
                                }`}>{p}</span>
                              </div>
                            );
                          })}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Capabilities Modal */}
      {capabilitiesModal && (
        <CapabilitiesModal
          isOpen={true}
          deviceId={capabilitiesModal.deviceId}
          deviceName={capabilitiesModal.deviceName}
          onClose={() => setCapabilitiesModal(null)}
          onSave={() => setCapabilitiesModal(null)}
        />
      )}
    </div>
  );
}
