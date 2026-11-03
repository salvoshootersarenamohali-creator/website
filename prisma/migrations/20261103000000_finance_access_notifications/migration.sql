ALTER TABLE "RangeUser" ADD COLUMN "isMaster" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "financeNotificationSince" TIMESTAMP(3);
ALTER TABLE "RangeUser" DROP CONSTRAINT "RangeUser_role_check";
ALTER TABLE "RangeUser" ADD CONSTRAINT "RangeUser_role_check" CHECK ("role" IN ('owner', 'coach', 'student', 'finance'));
ALTER TABLE "RangeUser" ADD CONSTRAINT "RangeUser_master_owner_check" CHECK (NOT "isMaster" OR "role" = 'owner');
CREATE UNIQUE INDEX "RangeUser_single_master" ON "RangeUser" ("isMaster") WHERE "isMaster" = true;
CREATE TABLE "RangeFinanceNotificationRead" (
  "userId" TEXT NOT NULL,
  "auditId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RangeFinanceNotificationRead_pkey" PRIMARY KEY ("userId", "auditId"),
  CONSTRAINT "RangeFinanceNotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RangeUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RangeFinanceNotificationRead_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "RangeAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "RangeFinanceNotificationRead_auditId_idx" ON "RangeFinanceNotificationRead"("auditId");
CREATE INDEX "RangeAudit_action_createdAt_idx" ON "RangeAudit"("action", "createdAt");
