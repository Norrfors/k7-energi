-- CreateTable
CREATE TABLE "MeterReading" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL DEFAULT 'c2314e97-c95b-40d4-9393-dbc541d586d1',
    "deviceName" TEXT NOT NULL DEFAULT 'Pulse Krokgatan 7',
    "consumptionSinceMidnight" DOUBLE PRECISION NOT NULL,
    "totalMeterValue" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeterReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeterReading_deviceId_createdAt_idx" ON "MeterReading"("deviceId", "createdAt");
