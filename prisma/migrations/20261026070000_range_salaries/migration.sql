-- CreateTable
CREATE TABLE "RangeSalaryPayment" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "salaryMonth" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "RangeSalaryPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RangeSalaryPayment_transactionId_key" ON "RangeSalaryPayment"("transactionId");

-- CreateIndex
CREATE INDEX "RangeSalaryPayment_coachId_salaryMonth_idx" ON "RangeSalaryPayment"("coachId", "salaryMonth");

-- AddForeignKey
ALTER TABLE "RangeSalaryPayment" ADD CONSTRAINT "RangeSalaryPayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "RangeFinanceTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeSalaryPayment" ADD CONSTRAINT "RangeSalaryPayment_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "RangeUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RangeSalaryPayment" ADD CONSTRAINT "RangeSalaryPayment_month_check" CHECK ("salaryMonth" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
INSERT INTO "RangeFinanceCategory" ("id", "locationId", "name", "kind") VALUES ('range-salaries', 'range-zirakpur', 'Coach salaries', 'expense');
