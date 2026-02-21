-- CreateTable
CREATE TABLE "TemperatureLog" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "zone" TEXT NOT NULL DEFAULT '',
    "temperature" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemperatureLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyLog" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "zone" TEXT NOT NULL DEFAULT '',
    "watts" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnergyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalData" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemperatureLog_deviceId_createdAt_idx" ON "TemperatureLog"("deviceId", "createdAt");

-- CreateIndex
CREATE INDEX "EnergyLog_deviceId_createdAt_idx" ON "EnergyLog"("deviceId", "createdAt");

-- CreateIndex
CREATE INDEX "ExternalData_source_fetchedAt_idx" ON "ExternalData"("source", "fetchedAt");
