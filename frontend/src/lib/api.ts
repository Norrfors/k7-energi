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
  const response = await fetch(`${API_BASE}${endpoint}`, options);

  if (!response.ok) {
    throw new Error(`API-fel: ${response.status} ${response.statusText}`);
  }

  return response.json();
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
      zone: string;
      lastUpdated: string;
    }>
  >("/api/homey/temperatures");
}

export function getEnergy() {
  return apiFetch<
    Array<{
      deviceName: string;
      watts: number | null;
      zone: string;
      lastUpdated: string;
    }>
  >("/api/homey/energy");
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