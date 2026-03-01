#!/usr/bin/env node

/**
 * set-version.js
 * Sätter NEXT_PUBLIC_VERSION från git describe --tags
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

try {
  // Hämta senaste git-tag
  const version = execSync("git describe --tags", { encoding: "utf-8" }).trim();
  const cleanVersion = version.replace(/^v/, ""); // Ta bort "v" prefix om det finns

  // Skriv till .env.local
  const envPath = path.join(__dirname, ".env.local");
  const envContent = `NEXT_PUBLIC_VERSION=${cleanVersion}\n`;

  fs.writeFileSync(envPath, envContent, "utf-8");
  console.log(`✅ Version inställd: ${cleanVersion}`);
  process.exit(0);
} catch (error) {
  console.error("⚠️ Kunde inte hämta git-tag:", error.message);
  // Fallback till dev
  const fs = require("fs");
  const path = require("path");
  const envPath = path.join(__dirname, ".env.local");
  fs.writeFileSync(envPath, "NEXT_PUBLIC_VERSION=dev\n", "utf-8");
  console.log("✅ Fallback version: dev");
  process.exit(0);
}
