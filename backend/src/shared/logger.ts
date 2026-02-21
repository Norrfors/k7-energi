// Logger – enkel loggningsfunktion för backend
// Skriver till konsol och loggfil.txt

import fs from "fs";
import path from "path";

const LOG_FILE = path.join(process.cwd(), "loggfil.txt");

export class Logger {
  private prefix: string;

  constructor(name: string) {
    this.prefix = `[${name}]`;
  }

  private writeToFile(level: string, message: string, data?: unknown) {
    try {
      const timestamp = new Date().toISOString();
      const logMessage = `${timestamp} ${this.prefix} ${level}: ${message}`;
      const fullMessage = data ? `${logMessage} | ${JSON.stringify(data)}` : logMessage;

      fs.appendFileSync(LOG_FILE, fullMessage + "\n", "utf-8");
    } catch (error) {
      console.error("Fel vid skrivning till loggfil:", error);
    }
  }

  info(message: string, data?: unknown) {
    const msg = `${this.prefix} INFO: ${message}`;
    console.log(msg, data || "");
    this.writeToFile("INFO", message, data);
  }

  warn(message: string, data?: unknown) {
    const msg = `${this.prefix} WARN: ${message}`;
    console.warn(msg, data || "");
    this.writeToFile("WARN", message, data);
  }

  error(message: string, error?: unknown) {
    const msg = `${this.prefix} ERROR: ${message}`;
    console.error(msg, error || "");
    const errorStr = error instanceof Error ? error.message : String(error);
    this.writeToFile("ERROR", message, errorStr);
  }

  debug(message: string, data?: unknown) {
    if (process.env.DEBUG === "true") {
      const msg = `${this.prefix} DEBUG: ${message}`;
      console.debug(msg, data || "");
      this.writeToFile("DEBUG", message, data);
    }
  }
}
