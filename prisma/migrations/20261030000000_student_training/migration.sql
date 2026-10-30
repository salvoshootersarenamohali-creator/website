-- AlterTable
ALTER TABLE "RangeUser" DROP CONSTRAINT "RangeUser_role_check";
ALTER TABLE "RangeUser" ADD CONSTRAINT "RangeUser_role_check" CHECK ("role" IN ('owner', 'coach', 'student'));

ALTER TABLE "RangeUser" ADD COLUMN     "shooterProfileId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "RangeShooterProfile" ADD COLUMN     "trainingVersion" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "RangeTrainingCoach" (
    "coachId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RangeTrainingCoach_pkey" PRIMARY KEY ("coachId","profileId")
);

-- CreateTable
CREATE TABLE "RangeTrainingPlan" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RangeTrainingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RangeTrainingPlanRevision" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RangeTrainingPlanRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RangeTrainingSession" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RangeTrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RangeTrainingSessionRevision" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "durationMinutes" INTEGER,
    "shotCount" INTEGER,
    "score" DECIMAL(12,2),
    "maximumScore" DECIMAL(12,2),
    "planRevisionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RangeTrainingSessionRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RangeTrainingReview" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "sessionVersion" INTEGER NOT NULL,
    "remarks" TEXT NOT NULL,
    "reviewed" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RangeTrainingReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RangeTrainingReviewRevision" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "sessionVersion" INTEGER NOT NULL,
    "remarks" TEXT NOT NULL,
    "reviewed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RangeTrainingReviewRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RangeTrainingMedia" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RangeTrainingMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RangeTrainingSubmission" (
    "key" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RangeTrainingSubmission_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "_TrainingPlanMedia" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TrainingPlanMedia_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TrainingTargetMedia" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TrainingTargetMedia_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "RangeTrainingCoach_profileId_active_idx" ON "RangeTrainingCoach"("profileId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "RangeTrainingPlan_profileId_date_key" ON "RangeTrainingPlan"("profileId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RangeTrainingPlanRevision_planId_version_key" ON "RangeTrainingPlanRevision"("planId", "version");

-- CreateIndex
CREATE INDEX "RangeTrainingSession_profileId_date_idx" ON "RangeTrainingSession"("profileId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RangeTrainingSessionRevision_sessionId_version_key" ON "RangeTrainingSessionRevision"("sessionId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "RangeTrainingReview_sessionId_coachId_key" ON "RangeTrainingReview"("sessionId", "coachId");

-- CreateIndex
CREATE UNIQUE INDEX "RangeTrainingReviewRevision_reviewId_version_key" ON "RangeTrainingReviewRevision"("reviewId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "RangeTrainingMedia_publicId_key" ON "RangeTrainingMedia"("publicId");

-- CreateIndex
CREATE INDEX "RangeTrainingMedia_expiresAt_idx" ON "RangeTrainingMedia"("expiresAt");

-- CreateIndex
CREATE INDEX "_TrainingPlanMedia_B_index" ON "_TrainingPlanMedia"("B");

-- CreateIndex
CREATE INDEX "_TrainingTargetMedia_B_index" ON "_TrainingTargetMedia"("B");

-- CreateIndex
CREATE UNIQUE INDEX "RangeUser_shooterProfileId_key" ON "RangeUser"("shooterProfileId");

-- AddForeignKey
ALTER TABLE "RangeUser" ADD CONSTRAINT "RangeUser_shooterProfileId_fkey" FOREIGN KEY ("shooterProfileId") REFERENCES "RangeShooterProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeTrainingCoach" ADD CONSTRAINT "RangeTrainingCoach_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "RangeUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeTrainingCoach" ADD CONSTRAINT "RangeTrainingCoach_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "RangeShooterProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeTrainingPlan" ADD CONSTRAINT "RangeTrainingPlan_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "RangeShooterProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeTrainingPlanRevision" ADD CONSTRAINT "RangeTrainingPlanRevision_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RangeTrainingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeTrainingPlanRevision" ADD CONSTRAINT "RangeTrainingPlanRevision_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "RangeUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeTrainingSession" ADD CONSTRAINT "RangeTrainingSession_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "RangeShooterProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeTrainingSessionRevision" ADD CONSTRAINT "RangeTrainingSessionRevision_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RangeTrainingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeTrainingSessionRevision" ADD CONSTRAINT "RangeTrainingSessionRevision_planRevisionId_fkey" FOREIGN KEY ("planRevisionId") REFERENCES "RangeTrainingPlanRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeTrainingReview" ADD CONSTRAINT "RangeTrainingReview_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RangeTrainingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeTrainingReview" ADD CONSTRAINT "RangeTrainingReview_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "RangeUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeTrainingReviewRevision" ADD CONSTRAINT "RangeTrainingReviewRevision_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "RangeTrainingReview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeTrainingMedia" ADD CONSTRAINT "RangeTrainingMedia_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "RangeUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeTrainingSubmission" ADD CONSTRAINT "RangeTrainingSubmission_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "RangeUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TrainingPlanMedia" ADD CONSTRAINT "_TrainingPlanMedia_A_fkey" FOREIGN KEY ("A") REFERENCES "RangeTrainingMedia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TrainingPlanMedia" ADD CONSTRAINT "_TrainingPlanMedia_B_fkey" FOREIGN KEY ("B") REFERENCES "RangeTrainingPlanRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TrainingTargetMedia" ADD CONSTRAINT "_TrainingTargetMedia_A_fkey" FOREIGN KEY ("A") REFERENCES "RangeTrainingMedia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TrainingTargetMedia" ADD CONSTRAINT "_TrainingTargetMedia_B_fkey" FOREIGN KEY ("B") REFERENCES "RangeTrainingSessionRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "RangeUser" ADD CONSTRAINT "RangeUser_student_profile_check"
  CHECK (("role" = 'student' AND "shooterProfileId" IS NOT NULL AND "username" IS NOT NULL) OR ("role" <> 'student' AND "shooterProfileId" IS NULL));
ALTER TABLE "RangeTrainingSession" ADD CONSTRAINT "RangeTrainingSession_discipline_check" CHECK ("discipline" IN ('pistol', 'rifle', 'general'));
ALTER TABLE "RangeTrainingSessionRevision" ADD CONSTRAINT "RangeTrainingSessionRevision_values_check" CHECK (
  "discipline" IN ('pistol', 'rifle', 'general') AND "version" > 0 AND
  ("durationMinutes" IS NULL OR "durationMinutes" BETWEEN 0 AND 1440) AND
  ("shotCount" IS NULL OR "shotCount" >= 0) AND
  (("score" IS NULL AND "maximumScore" IS NULL) OR ("score" IS NOT NULL AND "maximumScore" IS NOT NULL AND "score" >= 0 AND "maximumScore" > 0 AND "score" <= "maximumScore"))
);
ALTER TABLE "RangeTrainingMedia" ADD CONSTRAINT "RangeTrainingMedia_purpose_check" CHECK ("purpose" IN ('plan', 'target'));
