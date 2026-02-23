-- CreateTable
CREATE TABLE "SensorVisibility" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "sensorType" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SensorVisibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SensorVisibility_deviceId_key" ON "SensorVisibility"("deviceId");

-- CreateIndex
CREATE INDEX "SensorVisibility_sensorType_isVisible_idx" ON "SensorVisibility"("sensorType", "isVisible");
