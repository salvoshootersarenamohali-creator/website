-- CreateTable
CREATE TABLE "RangeTransfer" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "occurredOn" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "transactionId" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "submissionKey" TEXT NOT NULL,
    "submissionHash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RangeTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RangeTransfer_transactionId_key" ON "RangeTransfer"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "RangeTransfer_submissionKey_key" ON "RangeTransfer"("submissionKey");

-- CreateIndex
CREATE INDEX "RangeTransfer_locationId_status_idx" ON "RangeTransfer"("locationId", "status");

-- AddForeignKey
ALTER TABLE "RangeTransfer" ADD CONSTRAINT "RangeTransfer_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "RangeLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeTransfer" ADD CONSTRAINT "RangeTransfer_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "RangeUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeTransfer" ADD CONSTRAINT "RangeTransfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "RangeMoneyAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeTransfer" ADD CONSTRAINT "RangeTransfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "RangeMoneyAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeTransfer" ADD CONSTRAINT "RangeTransfer_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "RangeFinanceTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RangeFinanceTransaction" DROP CONSTRAINT "RangeFinanceTransaction_kind_check";
ALTER TABLE "RangeFinanceTransaction" ADD CONSTRAINT "RangeFinanceTransaction_kind_check" CHECK ("kind" IN ('income', 'expense', 'transfer'));
ALTER TABLE "RangeTransfer" ADD CONSTRAINT "RangeTransfer_accounts_check" CHECK ("fromAccountId" <> "toAccountId" AND "amountPaise" > 0);
ALTER TABLE "RangeTransfer" ADD CONSTRAINT "RangeTransfer_status_check" CHECK (("status" IN ('pending', 'rejected') AND "transactionId" IS NULL) OR ("status" IN ('confirmed', 'reversed') AND "transactionId" IS NOT NULL));
