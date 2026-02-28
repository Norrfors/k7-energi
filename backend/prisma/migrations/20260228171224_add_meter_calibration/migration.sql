-- CreateTable
CREATE TABLE "MeterCalibration" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL DEFAULT 'c2314e97-c95b-40d4-9393-dbc541d586d1',
    "calibrationValue" DOUBLE PRECISION NOT NULL,
    "calibrationDateTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeterCalibration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeterCalibration_deviceId_calibrationDateTime_idx" ON "MeterCalibration"("deviceId", "calibrationDateTime");

-- CreateIndex
CREATE UNIQUE INDEX "MeterCalibration_deviceId_calibrationDateTime_key" ON "MeterCalibration"("deviceId", "calibrationDateTime");
