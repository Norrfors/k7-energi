// API-klient – centraliserar alla anrop till backend.
// Användar samma värd som frontend (localhost eller IP från annat nätverk)

const getApiBase = () => {
  if (typeof window === "undefined") {
    return "http://localhost:3001"; // SSR fallback
  }
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:3001`;
};

const API_BASE = getApiBase();

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 500; // 500ms between retries
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`[API] Attempt ${attempt + 1}/${MAX_RETRIES} for ${endpoint}`);
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        signal: AbortSignal.timeout(5000), // 5 second timeout per request
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`[API] ✅ Success on attempt ${attempt + 1}: ${endpoint}`);
      return response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[API] Attempt ${attempt + 1} failed for ${endpoint}:`, lastError.message);
      
      // If it's the last attempt, throw immediately
      if (attempt === MAX_RETRIES - 1) {
        console.error(`[API] ❌ GIVING UP after ${MAX_RETRIES} attempts on ${endpoint}`);
        throw lastError;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }

  throw lastError || new Error("Unknown error");
}

// Specifika API-funktioner

export function getHealth() {
  return apiFetch<{ status: string; time: string; database: string }>(
    "/api/health"
  );
}

export function getTemperatures() {
  return apiFetch<
    Array<{
      deviceName: string;
      temperature: number | null;
      zone: string | null;
      lastUpdated: string;
    }>
  >("/api/homey/temperatures");
}

export function getTemperatureHistory(hours: number = 24) {
  return apiFetch<
    Array<{
      id: number;
      deviceName: string;
      temperature: number;
      createdAt: string;
    }>
  >(`/api/history/temperatures?hours=${hours}`);
}

export function getEnergy() {
  return apiFetch<
    Array<{
      deviceName: string;
      watts: number | null;
      zone: string | null;
      lastUpdated: string;
    }>
  >("/api/homey/energy");
}

export function discoverHomey() {
  return apiFetch<{
    found: boolean;
    devices: Array<{
      name: string;
      host: string;
      addresses: string[];
      port: number;
    }>;
    localIPs: string[];
    message: string;
  }>("/api/homey/discover");
}

// Mätardata endpoints

export function getMeterLatest() {
  return apiFetch<{
    consumptionSinceMidnight: number;
    totalMeterValue: number;
    lastUpdated: string;
  }>("/api/meter/latest");
}

export function getMeterToday() {
  return apiFetch<
    Array<{
      consumptionSinceMidnight: number;
      totalMeterValue: number;
      time: string;
    }>
  >("/api/meter/today");
}

export function getMeterLast24Hours() {
  return apiFetch<
    Array<{
      consumptionSinceMidnight: number;
      totalMeterValue: number;
      time: string;
    }>
  >("/api/meter/last24h");
}

export function setManualMeterValue(totalMeterValue: number) {
  return apiFetch<{ success: boolean; reading: unknown }>(
    "/api/meter/set-manual",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalMeterValue }),
    }
  );
}
// Backup endpoints

export interface BackupSettings {
  id: number;
  backupFolderPath: string;
  enableAutoBackup: boolean;
  backupDay: string;
  backupTime: string;
  lastBackupAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function getBackupSettings() {
  return apiFetch<BackupSettings>("/api/backup/settings");
}

export function saveBackupSettings(settings: {
  backupFolderPath?: string;
  enableAutoBackup?: boolean;
  backupDay?: string;
  backupTime?: string;
}) {
  return apiFetch<BackupSettings>("/api/backup/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
}

export function performManualBackup() {
  return apiFetch<{ success: boolean; filename: string; message: string }>(
    "/api/backup/manual",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );
}

// Settings endpoints – Sensor och visibility

export interface SensorInfo {
  deviceId: string;
  deviceName: string;
  sensorType: "temperature" | "energy";
  isVisible: boolean;
  zone?: string; // Fysisk plats från Homey (Hall, Matsal, etc)
  classification?: string; // INNE, UTE eller tom sträng - för radioknapparna
}

export function getTemperatureSensors() {
  return apiFetch<SensorInfo[]>("/api/settings/sensors/temperature");
}

export function getEnergySensors() {
  return apiFetch<SensorInfo[]>("/api/settings/sensors/energy");
}

export function updateSensorVisibility(deviceId: string, isVisible: boolean) {
  return apiFetch<SensorInfo>(
    `/api/settings/sensors/${deviceId}/visibility`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisible }),
    }
  );
}

export function updateSensorZone(deviceId: string, zone: string) {
  return apiFetch<SensorInfo>(
    `/api/settings/sensors/${deviceId}/zone`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zone }),
    }
  );
}

// Energi historik och sammanfattning

export interface EnergySummary {
  deviceId: string;
  currentWatts: number;
  currentTime: string;
  consumption1h: number;
  consumption12h: number;
  consumption24h: number;
  consumptionToday: number;
  consumptionPreviousDay: number;
}

export function getEnergySummary(deviceId?: string) {
  const url = deviceId 
    ? `/api/history/energy-summary?deviceId=${deviceId}`
    : "/api/history/energy-summary";
  return apiFetch<EnergySummary>(url);
}

export function getEnergyHistory(hours: number = 24) {
  return apiFetch<
    Array<{
      deviceId: string;
      deviceName: string;
      watts: number;
      meterPower?: number;
      zone?: string;
      createdAt: string;
    }>
  >(`/api/history/energy?hours=${hours}`);
}

// Mätarkalibrering

export interface CalibrationResult {
  success: boolean;
  calibrationPoint: {
    calibrationValue: number;
    calibrationDateTime: string;
  };
  updatedRecords: number;
  message: string;
}

export function calibrateMeter(
  calibrationValue: number,
  calibrationDateTime: string
) {
  return apiFetch<CalibrationResult>("/api/meter/calibrate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      calibrationValue,
      calibrationDateTime,
    }),
  });
}

export function getCalibrationHistory() {
  return apiFetch<
    Array<{
      calibrationValue: number;
      calibrationDateTime: string;
      savedAt: string;
    }>
  >("/api/meter/calibrations");
}
