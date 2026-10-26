-- CreateTable
CREATE TABLE "RangeShift" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "inAt" TIMESTAMP(3) NOT NULL,
    "outAt" TIMESTAMP(3),
    "originalInAt" TIMESTAMP(3),
    "originalOutAt" TIMESTAMP(3),
    "inPhoto" TEXT,
    "outPhoto" TEXT,
    "adjusted" BOOLEAN NOT NULL DEFAULT false,
    "openKey" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RangeShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RangeAttendanceChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "shiftId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "outcomeShiftId" TEXT,

    CONSTRAINT "RangeAttendanceChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RangeCorrection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "proposed" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolution" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RangeCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RangeShift_openKey_key" ON "RangeShift"("openKey");

-- CreateIndex
CREATE INDEX "RangeShift_locationId_inAt_idx" ON "RangeShift"("locationId", "inAt");

-- CreateIndex
CREATE INDEX "RangeShift_userId_inAt_idx" ON "RangeShift"("userId", "inAt");

-- CreateIndex
CREATE INDEX "RangeAttendanceChallenge_userId_expiresAt_idx" ON "RangeAttendanceChallenge"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "RangeCorrection_locationId_status_idx" ON "RangeCorrection"("locationId", "status");

-- AddForeignKey
ALTER TABLE "RangeShift" ADD CONSTRAINT "RangeShift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RangeUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeShift" ADD CONSTRAINT "RangeShift_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "RangeLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeAttendanceChallenge" ADD CONSTRAINT "RangeAttendanceChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RangeUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeAttendanceChallenge" ADD CONSTRAINT "RangeAttendanceChallenge_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "RangeLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeCorrection" ADD CONSTRAINT "RangeCorrection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RangeUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeCorrection" ADD CONSTRAINT "RangeCorrection_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "RangeLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RangeShift" ADD CONSTRAINT "RangeShift_times_check" CHECK ("outAt" IS NULL OR "outAt" > "inAt");
ALTER TABLE "RangeShift" ADD CONSTRAINT "RangeShift_open_check" CHECK (("outAt" IS NULL AND "openKey" = "userId") OR ("outAt" IS NOT NULL AND "openKey" IS NULL));
ALTER TABLE "RangeAttendanceChallenge" ADD CONSTRAINT "RangeAttendanceChallenge_action_check" CHECK ("action" IN ('in', 'out'));
