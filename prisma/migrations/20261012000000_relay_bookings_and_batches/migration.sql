CREATE TABLE "RegistrationBatch" (
"id" TEXT NOT NULL PRIMARY KEY, "competitionId" TEXT NOT NULL, "submissionKey" TEXT NOT NULL UNIQUE,
"academy" TEXT NOT NULL, "coachName" TEXT NOT NULL, "phone" TEXT NOT NULL,
"paymentMode" TEXT NOT NULL, "paymentStatus" TEXT NOT NULL, "utrNumber" TEXT,
"screenshotPath" TEXT, "amount" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "RegistrationBatch_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE INDEX "RegistrationBatch_competitionId_idx" ON "RegistrationBatch"("competitionId");
ALTER TABLE "Registration" ADD COLUMN "batchId" TEXT;
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "RegistrationBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Registration_batchId_idx" ON "Registration"("batchId");
CREATE TABLE "RegistrationRelayBooking" (
"id" TEXT NOT NULL PRIMARY KEY, "registrationId" TEXT NOT NULL UNIQUE, "competitionId" TEXT NOT NULL,
"date" TEXT NOT NULL, "relayId" TEXT NOT NULL, "pool" TEXT NOT NULL, "lane" INTEGER NOT NULL CHECK ("lane" > 0),
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "RegistrationRelayBooking_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE,
CONSTRAINT "RegistrationRelayBooking_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
CONSTRAINT "RegistrationRelayBooking_pool_check" CHECK ("pool" IN ('standard', 'special')));
CREATE UNIQUE INDEX "RegistrationRelayBooking_competitionId_date_relayId_pool_la_key" ON "RegistrationRelayBooking"("competitionId","date","relayId","pool","lane");
CREATE INDEX "RegistrationRelayBooking_competitionId_date_idx" ON "RegistrationRelayBooking"("competitionId","date");
