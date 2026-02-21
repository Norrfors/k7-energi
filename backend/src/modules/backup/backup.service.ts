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

      // Konstruera pg_dump-kommando
      const dbUrl = process.env.DATABASE_URL || 'postgresql://energi_user:energi_pass@localhost:5432/energi_db';
      
      // Använd docker exec om vi är i containeriserad miljö
      const isWindows = process.platform === 'win32';
      const dockerCommand = isWindows 
        ? `docker exec k7-energi-db-1 pg_dump -U energi_user -d energi_db | gzip > "${filepath}"`
        : `docker exec k7-energi-db-1 pg_dump -U energi_user -d energi_db | gzip > ${filepath}`;
      const localCommand = isWindows
        ? `pg_dump ${dbUrl} | gzip > "${filepath}"`
        : `pg_dump ${dbUrl} | gzip > ${filepath}`;
      
      // Försök med docker först, fallback till lokal
      try {
        const shell = isWindows ? 'cmd.exe' : '/bin/sh';
        execSync(dockerCommand, { shell } as any);
        console.log(`[Backup] Backup framgångsrikt sparad: ${filepath}`);
      } catch (dockerError) {
        console.log('[Backup] Docker-metod misslyckades, försöker lokal pg_dump...');
        try {
          const shell = isWindows ? 'cmd.exe' : '/bin/sh';
          execSync(localCommand, { shell } as any);
        } catch (localError) {
          throw localError;
        }
      }

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
