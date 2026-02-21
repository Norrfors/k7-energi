import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BackupService } from './backup.service';

const backupService = new BackupService();

export async function backupRoutes(app: FastifyInstance) {
  /**
   * GET /api/backup/settings
   * Hämtar nuvarande backup-inställningar
   */
  app.get('/api/backup/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const settings = await backupService.getBackupSettings();
      reply.send(settings);
    } catch (error) {
      console.error('[Backup] Fel vid hämtning av inställningar:', error);
      reply.code(500).send({ error: 'Kunde inte hämta backupinställningar' });
    }
  });

  /**
   * POST /api/backup/settings
   * Sparar backup-inställningar
   */
  app.post('/api/backup/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as {
        backupFolderPath?: string;
        enableAutoBackup?: boolean;
        backupDay?: string;
        backupTime?: string;
      };
      const { backupFolderPath, enableAutoBackup, backupDay, backupTime } = body;

      // Validera inmatning
      if (
        (backupFolderPath && typeof backupFolderPath !== 'string') ||
        (enableAutoBackup !== undefined && typeof enableAutoBackup !== 'boolean') ||
        (backupDay && typeof backupDay !== 'string') ||
        (backupTime && typeof backupTime !== 'string')
      ) {
        return reply.code(400).send({ error: 'Ogiltig inmatning' });
      }

      // Hämta nuvarande inställningar och uppdatera med nya värden
      const current = await backupService.getBackupSettings();
      const updated = await backupService.saveBackupSettings({
        backupFolderPath: backupFolderPath || current.backupFolderPath,
        enableAutoBackup: enableAutoBackup !== undefined ? enableAutoBackup : current.enableAutoBackup,
        backupDay: backupDay || current.backupDay,
        backupTime: backupTime || current.backupTime,
      });

      reply.send(updated);
    } catch (error) {
      console.error('[Backup] Fel vid sparning av inställningar:', error);
      reply.code(500).send({ error: 'Kunde inte spara backupinställningar' });
    }
  });

  /**
   * POST /api/backup/manual
   * Kör en manuell backup omedelbar
   */
  app.post('/api/backup/manual', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await backupService.performBackup();
      if (result.success) {
        reply.send(result);
      } else {
        reply.code(500).send(result);
      }
    } catch (error) {
      console.error('[Backup] Fel vid manuell backup:', error);
      reply.code(500).send({ error: 'Kunde inte utföra backup' });
    }
  });
}

export { BackupService };
