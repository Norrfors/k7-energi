-- CreateTable
CREATE TABLE "BackupSettings" (
    "id" SERIAL NOT NULL,
    "backupFolderPath" TEXT NOT NULL DEFAULT './backups',
    "enableAutoBackup" BOOLEAN NOT NULL DEFAULT false,
    "backupDay" TEXT NOT NULL DEFAULT 'Monday',
    "backupTime" TEXT NOT NULL DEFAULT '02:00',
    "lastBackupAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackupSettings_pkey" PRIMARY KEY ("id")
);
