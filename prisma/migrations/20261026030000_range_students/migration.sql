-- CreateTable
CREATE TABLE "RangeShooterProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RangeShooterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RangeEnrollment" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "submissionKey" TEXT NOT NULL,
    "submissionHash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RangeEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RangeStudentAttendance" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "markedById" TEXT NOT NULL,
    "submissionKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RangeStudentAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RangeShooterProfile_name_idx" ON "RangeShooterProfile"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RangeEnrollment_submissionKey_key" ON "RangeEnrollment"("submissionKey");

-- CreateIndex
CREATE INDEX "RangeEnrollment_locationId_active_idx" ON "RangeEnrollment"("locationId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "RangeEnrollment_profileId_locationId_key" ON "RangeEnrollment"("profileId", "locationId");

-- CreateIndex
CREATE INDEX "RangeStudentAttendance_date_idx" ON "RangeStudentAttendance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "RangeStudentAttendance_enrollmentId_date_key" ON "RangeStudentAttendance"("enrollmentId", "date");

-- AddForeignKey
ALTER TABLE "RangeEnrollment" ADD CONSTRAINT "RangeEnrollment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "RangeShooterProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeEnrollment" ADD CONSTRAINT "RangeEnrollment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "RangeLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeEnrollment" ADD CONSTRAINT "RangeEnrollment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "RangeUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeStudentAttendance" ADD CONSTRAINT "RangeStudentAttendance_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "RangeEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeStudentAttendance" ADD CONSTRAINT "RangeStudentAttendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "RangeUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
