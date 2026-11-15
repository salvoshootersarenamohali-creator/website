ALTER TABLE "Registration" ALTER COLUMN "dateOfBirth" DROP NOT NULL;
ALTER TABLE "Registration" ALTER COLUMN "preferredDate" DROP NOT NULL;

CREATE TABLE "BharatCupRecordedResult" (
    "entryId" TEXT NOT NULL,
    "matchDate" DATE NOT NULL,
    "sourceRow" INTEGER NOT NULL,
    "sourceDigest" TEXT NOT NULL,
    "reportedMatch" TEXT NOT NULL,
    "flaggedSeriesTwo" DOUBLE PRECISION,
    CONSTRAINT "BharatCupRecordedResult_pkey" PRIMARY KEY ("entryId"),
    CONSTRAINT "BharatCupRecordedResult_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "RegistrationEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BharatCupRecordedResult_matchDate_sourceRow_key" ON "BharatCupRecordedResult"("matchDate", "sourceRow");
