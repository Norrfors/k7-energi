-- AddColumn capabilitiesToLog to SensorVisibility
ALTER TABLE "SensorVisibility" ADD COLUMN "capabilitiesToLog" JSONB NOT NULL DEFAULT '[]';
