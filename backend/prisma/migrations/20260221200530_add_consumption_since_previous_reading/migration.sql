-- AlterTable
ALTER TABLE "MeterReading" ADD COLUMN     "consumptionSincePreviousReading" DOUBLE PRECISION NOT NULL DEFAULT 0;
