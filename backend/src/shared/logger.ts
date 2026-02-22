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
      // Formatera timestamp i svenskt format (Stockholm-tid): YYYY-MM-DD HH:MM:SS.mmm
      const now = new Date();
      const ms = String(now.getMilliseconds()).padStart(3, '0');
      
      // Använd Intl.DateTimeFormat för att få Stockholm-tidszonen
      const timeFormatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Stockholm',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      
      const parts = timeFormatter.formatToParts(now);
      const year = parts.find(p => p.type === 'year')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      const hour = parts.find(p => p.type === 'hour')?.value;
      const minute = parts.find(p => p.type === 'minute')?.value;
      const second = parts.find(p => p.type === 'second')?.value;
      
      const timestamp = `${year}-${month}-${day} ${hour}:${minute}:${second}.${ms}`;
      
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
