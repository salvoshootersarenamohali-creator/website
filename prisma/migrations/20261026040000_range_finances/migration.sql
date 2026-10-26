-- CreateTable
CREATE TABLE "RangeMoneyAccount" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "custodian" TEXT NOT NULL,
    "coachId" TEXT,
    "channel" TEXT NOT NULL,
    "openingPaise" INTEGER NOT NULL DEFAULT 0,
    "openingDate" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RangeMoneyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RangeProduct" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'item',
    "defaultPricePaise" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RangeProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RangeFinanceCategory" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RangeFinanceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RangeFinanceTransaction" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "categoryId" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "occurredOn" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT,
    "quantity" INTEGER,
    "unitPricePaise" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'posted',
    "submissionKey" TEXT NOT NULL,
    "submissionHash" TEXT NOT NULL,
    "correctsId" TEXT,
    "refundOfId" TEXT,
    "receiptId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RangeFinanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RangeMoneyMovement" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,

    CONSTRAINT "RangeMoneyMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RangeMoneyAccount_locationId_idx" ON "RangeMoneyAccount"("locationId");

-- CreateIndex
CREATE INDEX "RangeProduct_locationId_idx" ON "RangeProduct"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "RangeFinanceCategory_locationId_name_kind_key" ON "RangeFinanceCategory"("locationId", "name", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "RangeFinanceTransaction_submissionKey_key" ON "RangeFinanceTransaction"("submissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "RangeFinanceTransaction_correctsId_key" ON "RangeFinanceTransaction"("correctsId");

-- CreateIndex
CREATE INDEX "RangeFinanceTransaction_locationId_occurredOn_idx" ON "RangeFinanceTransaction"("locationId", "occurredOn");

-- CreateIndex
CREATE INDEX "RangeFinanceTransaction_recordedById_idx" ON "RangeFinanceTransaction"("recordedById");

-- CreateIndex
CREATE INDEX "RangeMoneyMovement_accountId_idx" ON "RangeMoneyMovement"("accountId");

-- CreateIndex
CREATE INDEX "RangeMoneyMovement_transactionId_idx" ON "RangeMoneyMovement"("transactionId");

-- AddForeignKey
ALTER TABLE "RangeMoneyAccount" ADD CONSTRAINT "RangeMoneyAccount_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "RangeLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeMoneyAccount" ADD CONSTRAINT "RangeMoneyAccount_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "RangeUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeProduct" ADD CONSTRAINT "RangeProduct_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "RangeLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeFinanceCategory" ADD CONSTRAINT "RangeFinanceCategory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "RangeLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeFinanceTransaction" ADD CONSTRAINT "RangeFinanceTransaction_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "RangeLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeFinanceTransaction" ADD CONSTRAINT "RangeFinanceTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "RangeUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeFinanceTransaction" ADD CONSTRAINT "RangeFinanceTransaction_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "RangeUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeFinanceTransaction" ADD CONSTRAINT "RangeFinanceTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "RangeProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeFinanceTransaction" ADD CONSTRAINT "RangeFinanceTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RangeFinanceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeFinanceTransaction" ADD CONSTRAINT "RangeFinanceTransaction_correctsId_fkey" FOREIGN KEY ("correctsId") REFERENCES "RangeFinanceTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeFinanceTransaction" ADD CONSTRAINT "RangeFinanceTransaction_refundOfId_fkey" FOREIGN KEY ("refundOfId") REFERENCES "RangeFinanceTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeMoneyMovement" ADD CONSTRAINT "RangeMoneyMovement_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "RangeFinanceTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeMoneyMovement" ADD CONSTRAINT "RangeMoneyMovement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "RangeMoneyAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RangeFinanceTransaction" ADD CONSTRAINT "RangeFinanceTransaction_kind_check" CHECK ("kind" IN ('income', 'expense'));
ALTER TABLE "RangeFinanceTransaction" ADD CONSTRAINT "RangeFinanceTransaction_amount_check" CHECK ("amountPaise" > 0);
ALTER TABLE "RangeMoneyMovement" ADD CONSTRAINT "RangeMoneyMovement_amount_check" CHECK ("amountPaise" <> 0);
INSERT INTO "RangeFinanceCategory" ("id", "locationId", "name", "kind") VALUES
 ('range-sale', 'range-zirakpur', 'Product sales', 'income'),
 ('range-other-income', 'range-zirakpur', 'Other income', 'income'),
 ('range-supplies', 'range-zirakpur', 'Supplies', 'expense'),
 ('range-rent', 'range-zirakpur', 'Rent', 'expense'),
 ('range-utilities', 'range-zirakpur', 'Utilities', 'expense'),
 ('range-other-expense', 'range-zirakpur', 'Other expense', 'expense');
