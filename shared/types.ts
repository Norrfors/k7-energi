// Delade typer mellan backend och frontend
// Dessa definierar "kontraktet" mellan front och back

export interface HealthResponse {
  status: string;
  time: string;
  database: string;
}

export interface HomeyDevice {
  id: string;
  name: string;
  zone: string;
  available: boolean;
}

export interface TemperatureReading {
  deviceName: string;
  temperature: number | null;
  zone: string;
  lastUpdated: string;
}

export interface EnergyReading {
  deviceName: string;
  watts: number | null;
  zone: string;
  lastUpdated: string;
}

export interface DashboardData {
  temperatures: TemperatureReading[];
  energy: EnergyReading[];
  lastFetched: string;
}

export interface DiscoveredHomey {
  name: string;
  host: string;
  addresses: string[];
  port: number;
  txt: Record<string, string>;
}

export interface DiscoverResponse {
  found: boolean;
  devices: DiscoveredHomey[];
  localIPs: string[];
  message: string;
}

export interface MeterReading {
  consumptionSinceMidnight: number; // Förbrukning sedan midnatt (kWh)
  totalMeterValue: number; // Total mätarställning (kWh)
  lastUpdated?: string;
  time?: string;
}
