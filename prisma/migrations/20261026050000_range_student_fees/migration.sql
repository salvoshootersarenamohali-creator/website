-- CreateTable
CREATE TABLE "RangeStudentFee" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "coverageStart" TEXT NOT NULL,
    "coverageEnd" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "RangeStudentFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RangeStudentFee_transactionId_key" ON "RangeStudentFee"("transactionId");

-- CreateIndex
CREATE INDEX "RangeStudentFee_enrollmentId_coverageStart_idx" ON "RangeStudentFee"("enrollmentId", "coverageStart");

-- AddForeignKey
ALTER TABLE "RangeStudentFee" ADD CONSTRAINT "RangeStudentFee_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "RangeFinanceTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeStudentFee" ADD CONSTRAINT "RangeStudentFee_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "RangeEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RangeStudentFee" ADD CONSTRAINT "RangeStudentFee_period_check" CHECK ("months" BETWEEN 1 AND 120 AND "coverageEnd" >= "coverageStart" AND "type" IN ('admission', 'renewal'));
INSERT INTO "RangeFinanceCategory" ("id", "locationId", "name", "kind") VALUES
 ('range-admissions', 'range-zirakpur', 'Admissions', 'income'),
 ('range-renewals', 'range-zirakpur', 'Renewals', 'income');
