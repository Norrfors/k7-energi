#!/usr/bin/env node
/**
 * Export alla Homey-enheter till CSV-fil
 * Kör: node scripts/export-homey-devices.js
 */

const fs = require("fs");
const path = require("path");

const HOMEY_ADDRESS = process.env.HOMEY_ADDRESS || "http://192.168.1.122";
const HOMEY_TOKEN = process.env.HOMEY_TOKEN || "";

async function getHomeyDevices() {
  const response = await fetch(`${HOMEY_ADDRESS}/api/manager/devices/device/`, {
    headers: {
      Authorization: `Bearer ${HOMEY_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Homey API svarade med ${response.status}: ${response.statusText}`);
  }

  const devices = await response.json();
  return Object.values(devices);
}

function escapeCSV(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function main() {
  try {
    console.log("📡 Hämtar enheter från Homey Pro...");
    const devices = await getHomeyDevices();

    if (!Array.isArray(devices)) {
      throw new Error("Unexpected response format from Homey");
    }

    console.log(`✅ Hämtade ${devices.length} enheter`);

    // Skapa CSV-header
    const headers = ["Enhets-ID", "Namn", "Zon", "Klassificering", "Capabilities", "Verktyg"];
    const rows = [];

    // Fyll rows med enhetsinformation
    for (const device of devices) {
      rows.push([
        escapeCSV(device.id),
        escapeCSV(device.name),
        escapeCSV(device.zoneName || "Okänd"),
        escapeCSV(device.class || "Okänd"),
        escapeCSV(device.capabilities?.join(", ") || "Ingen"),
        escapeCSV(device.driverUri || ""),
      ]);
    }

    // Skapa CSV-text
    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Spara till fil
    const outputDir = path.join(__dirname, "..", "data");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `homey_devices_${new Date().toISOString().split("T")[0]}.csv`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, csv, "utf-8");

    console.log(`✅ CSV-fil sparad: ${filepath}`);
    console.log(`📊 Total enheter exporterade: ${devices.length}`);
    console.log(`🔗 Öppna i Excel: ${filepath}`);
  } catch (error) {
    console.error("❌ Fel:", error.message);
    process.exit(1);
  }
}

main();
