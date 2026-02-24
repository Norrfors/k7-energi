-- AddColumn zone to SensorVisibility
ALTER TABLE "SensorVisibility" ADD COLUMN "zone" TEXT NOT NULL DEFAULT '';
