import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import db from '../../shared/db';

export class BackupService {
  /**
   * Hämtar nuvarande backup-inställningar
   */
  async getBackupSettings() {
    let settings = await db.backupSettings.findFirst();
    
    // Om det inte finns inställningar, skapa default
    if (!settings) {
      settings = await db.backupSettings.create({
        data: {
          backupFolderPath: './backups',
          enableAutoBackup: false,
          backupDay: 'Monday',
          backupTime: '02:00',
        },
      });
    }
    
    return settings;
  }

  /**
   * Sparar backup-inställningar
   */
  async saveBackupSettings(data: {
    backupFolderPath: string;
    enableAutoBackup: boolean;
    backupDay: string;
    backupTime: string;
  }) {
    const settings = await db.backupSettings.upsert({
      where: { id: 1 },
      update: data,
      create: {
        id: 1,
        ...data,
      },
    });
    return settings;
  }

  /**
   * Kör en manuell backup
   */
  async performBackup(): Promise<{ success: boolean; filename: string; message: string }> {
    try {
      const settings = await this.getBackupSettings();
      
      // Skapa backup-mappen om den inte finns
      const backupFolder = path.resolve(settings.backupFolderPath);
      if (!fs.existsSync(backupFolder)) {
        fs.mkdirSync(backupFolder, { recursive: true });
      }

      // Skapa filename med tidsstämpel
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `backup_${timestamp}.sql.gz`;
      const filepath = path.join(backupFolder, filename);

      // Kör pg_dump direkt mot DB-containern via Docker-nätverket
      const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@db:5432/homey_db';
      const command = `pg_dump "${dbUrl}" | gzip > "${filepath}"`;
      execSync(command, { shell: '/bin/sh' });
      console.log(`[Backup] Backup framgångsrikt sparad: ${filepath}`);

      // Uppdatera lastBackupAt
      await db.backupSettings.update({
        where: { id: 1 },
        data: { lastBackupAt: new Date() },
      });

      return {
        success: true,
        filename,
        message: `Backup sparad: ${filename}`,
      };
    } catch (error) {
      console.error('[Backup] Fel vid backup:', error);
      return {
        success: false,
        filename: '',
        message: `Backup misslyckades: ${error instanceof Error ? error.message : 'Okänt fel'}`,
      };
    }
  }

  /**
   * Kontrollerar om det är tid för automatisk backup
   */
  async shouldRunAutoBackup(): Promise<boolean> {
    const settings = await this.getBackupSettings();
    
    if (!settings.enableAutoBackup) {
      return false;
    }

    const now = new Date();
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = dayOfWeek[now.getDay()];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Kontrollera om vi är på rätt dag och tidsintervall (±5 minuter)
    const [backupHour, backupMinute] = settings.backupTime.split(':').map(Number);
    const backupDate = new Date();
    backupDate.setHours(backupHour, backupMinute, 0);

    const timeDifference = Math.abs(now.getTime() - backupDate.getTime()) / 1000 / 60; // i minuter
    const isRightDay = currentDay === settings.backupDay;
    const isRightTime = timeDifference <= 5;

    return isRightDay && isRightTime;
  }
}
