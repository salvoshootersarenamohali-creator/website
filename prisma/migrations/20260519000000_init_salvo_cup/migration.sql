-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academy" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "phone" TEXT NOT NULL,
    "preferredDate" TIMESTAMP(3) NOT NULL,
    "preferredSlot" TEXT NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "utrNumber" TEXT,
    "screenshotPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Registration_preferredDate_idx" ON "Registration"("preferredDate");

-- CreateIndex
CREATE INDEX "Registration_paymentStatus_idx" ON "Registration"("paymentStatus");

-- CreateTable
CREATE TABLE "RegistrationEntry" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventTitle" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "ruleSet" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "categoryLabel" TEXT NOT NULL,
    "fee" INTEGER NOT NULL,
    "seriesScores" JSONB,
    "totalScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistrationEntry_eventId_idx" ON "RegistrationEntry"("eventId");

-- CreateIndex
CREATE INDEX "RegistrationEntry_categoryCode_idx" ON "RegistrationEntry"("categoryCode");

-- CreateIndex
CREATE INDEX "RegistrationEntry_ruleSet_idx" ON "RegistrationEntry"("ruleSet");

-- AddForeignKey
ALTER TABLE "RegistrationEntry" ADD CONSTRAINT "RegistrationEntry_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
