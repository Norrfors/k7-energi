// API-klient – centraliserar alla anrop till backend.
// Om du ändrar backend-URL:en behöver du bara ändra här.

const API_BASE = "http://localhost:3001";

export async function apiFetch<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`);

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
