-- CreateTable
CREATE TABLE "TeamEntry" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academy" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 900,
    "paymentMode" TEXT NOT NULL DEFAULT 'cash',
    "paymentStatus" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamEntryMember" (
    "id" TEXT NOT NULL,
    "teamEntryId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "registrationEntryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamEntryMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamEntry_competitionId_idx" ON "TeamEntry"("competitionId");

-- CreateIndex
CREATE INDEX "TeamEntry_discipline_idx" ON "TeamEntry"("discipline");

-- CreateIndex
CREATE INDEX "TeamEntry_paymentStatus_idx" ON "TeamEntry"("paymentStatus");

-- CreateIndex
CREATE INDEX "TeamEntryMember_teamEntryId_idx" ON "TeamEntryMember"("teamEntryId");

-- CreateIndex
CREATE INDEX "TeamEntryMember_registrationId_idx" ON "TeamEntryMember"("registrationId");

-- CreateIndex
CREATE INDEX "TeamEntryMember_registrationEntryId_idx" ON "TeamEntryMember"("registrationEntryId");

-- AddForeignKey
ALTER TABLE "TeamEntry" ADD CONSTRAINT "TeamEntry_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamEntryMember" ADD CONSTRAINT "TeamEntryMember_teamEntryId_fkey" FOREIGN KEY ("teamEntryId") REFERENCES "TeamEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamEntryMember" ADD CONSTRAINT "TeamEntryMember_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamEntryMember" ADD CONSTRAINT "TeamEntryMember_registrationEntryId_fkey" FOREIGN KEY ("registrationEntryId") REFERENCES "RegistrationEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
