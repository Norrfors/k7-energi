"use client";

// "use client" krävs för sidor som använder React hooks (useState, useEffect).
// Utan den renderas sidan på servern och kan inte ha interaktivitet.

import { useEffect, useState } from "react";
import { getHealth, getTemperatures, getEnergy, discoverHomey } from "@/lib/api";
import { StatusCard } from "@/components/StatusCard";

// Typer för datan vi hämtar
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

export default function Dashboard() {
  // State – variabler som triggar omrendering när de ändras.
  // Tänk det som databinding i WPF/WinForms, fast med funktionsanrop.
  const [health, setHealth] = useState<Health | null>(null);
  const [temperatures, setTemperatures] = useState<Temperature[]>([]);
  const [energy, setEnergy] = useState<Energy[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [homeyConnected, setHomeyConnected] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoverResult, setDiscoverResult] = useState<{
    found: boolean;
    devices: Array<{ name: string; host: string; addresses: string[]; port: number }>;
    localIPs: string[];
    message: string;
  } | null>(null);

  // useEffect körs en gång när sidan laddas (tack vare [] i slutet).
  // Här hämtar vi data från backend.
  useEffect(() => {
    async function loadData() {
      try {
        // Hämta backend-status
        const healthData = await getHealth();
        setHealth(healthData);

        // Försök hämta Homey-data
        try {
          const [tempData, energyData] = await Promise.all([
            getTemperatures(),
            getEnergy(),
          ]);
          setTemperatures(tempData);
          setEnergy(energyData);
          setHomeyConnected(true);
        } catch {
          // Homey kanske inte är konfigurerad än – det är ok
          setHomeyConnected(false);
        }
      } catch (err) {
        setError("Kunde inte ansluta till backend. Kör den på port 3001?");
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // Uppdatera var 30:e sekund
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval); // Städa upp vid avmontering
  }, []);

  // Sök Homey Pro på LAN via mDNS (tar ~8 sekunder)
  async function handleDiscover() {
    setDiscovering(true);
    setDiscoverResult(null);
    try {
      const result = await discoverHomey();
      setDiscoverResult(result);
    } catch {
      setDiscoverResult({
        found: false,
        devices: [],
        localIPs: [],
        message: "Kunde inte kontakta backend. Är den igång?",
      });
    } finally {
      setDiscovering(false);
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
        <p className="text-sm text-red-600 mt-4">
          Se till att backend kör: <code>cd backend && npm run dev</code>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Backend-status */}
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
            subtitle={!homeyConnected ? "Konfigurera i .env" : ""}
            color={homeyConnected ? "green" : "gray"}
          />
        </div>
      </section>

      {/* Temperaturer */}
      {temperatures.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Temperaturer</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {temperatures.map((t) => (
              <StatusCard
                key={t.deviceName}
                title={t.deviceName}
                value={t.temperature !== null ? `${t.temperature}°C` : "–"}
                subtitle={t.zone}
                color="blue"
              />
            ))}
          </div>
        </section>
      )}

      {/* Energi */}
      {energy.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Energiförbrukning</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {energy.map((e) => (
              <StatusCard
                key={e.deviceName}
                title={e.deviceName}
                value={e.watts !== null ? `${e.watts} W` : "–"}
                subtitle={e.zone}
                color="orange"
              />
            ))}
          </div>
        </section>
      )}

      {/* Sök Homey på LAN */}
      <section className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-1">Sök Homey Pro på nätverket</h2>
        <p className="text-sm text-gray-500 mb-4">
          Söker via mDNS (Bonjour/Zeroconf) — tar upp till 8 sekunder.
        </p>
        <button
          onClick={handleDiscover}
          disabled={discovering}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {discovering ? "Söker…" : "Sök Homey Pro"}
        </button>

        {discoverResult && (
          <div className={`mt-4 rounded-lg p-4 ${discoverResult.found ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
            <p className={`font-medium text-sm ${discoverResult.found ? "text-green-800" : "text-yellow-800"}`}>
              {discoverResult.message}
            </p>

            {discoverResult.devices.length > 0 && (
              <ul className="mt-3 space-y-2">
                {discoverResult.devices.map((d, i) => (
                  <li key={i} className="bg-white rounded border border-green-200 p-3 text-sm">
                    <p className="font-semibold text-gray-800">{d.name}</p>
                    <p className="text-gray-600">Host: <code className="bg-gray-100 px-1 rounded">{d.host}</code></p>
                    {d.addresses.length > 0 && (
                      <p className="text-gray-600">
                        IP:{" "}
                        {d.addresses.map((a, j) => (
                          <code key={j} className="bg-green-100 px-1 rounded mr-1">{a}</code>
                        ))}
                      </p>
                    )}
                    <p className="text-gray-500 mt-1">
                      Lägg till i .env: <code className="bg-gray-100 px-1 rounded">HOMEY_ADDRESS=http://{d.addresses[0] || d.host}</code>
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {discoverResult.localIPs.length > 0 && (
              <p className="mt-3 text-xs text-gray-500">
                Datorns IP-adresser: {discoverResult.localIPs.join(", ")}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Hjälptext om Homey inte är konfigurerad */}
      {!homeyConnected && (
        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-800">
            Kom igång med Homey
          </h2>
          <ol className="mt-3 space-y-2 text-blue-700 text-sm">
            <li>1. Skapa en API-nyckel i Homey Web App → Settings → API Keys</li>
            <li>2. Kopiera .env.example till .env</li>
            <li>3. Fyll i HOMEY_ADDRESS (Homeys IP) och HOMEY_TOKEN (API-nyckeln)</li>
            <li>4. Starta om backend</li>
          </ol>
        </section>
      )}
    </div>
  );
}
