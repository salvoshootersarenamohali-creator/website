-- CreateTable
CREATE TABLE "RangeUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'coach',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RangeUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RangeLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RangeLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RangeMembership" (
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "RangeMembership_pkey" PRIMARY KEY ("userId","locationId")
);

-- CreateTable
CREATE TABLE "RangeSession" (
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RangeSession_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "RangeLoginAttempt" (
    "id" TEXT NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RangeLoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RangeAudit" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "locationId" TEXT,
    "action" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RangeAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RangeUser_phone_key" ON "RangeUser"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "RangeLocation_slug_key" ON "RangeLocation"("slug");

-- CreateIndex
CREATE INDEX "RangeMembership_locationId_idx" ON "RangeMembership"("locationId");

-- CreateIndex
CREATE INDEX "RangeSession_userId_idx" ON "RangeSession"("userId");

-- CreateIndex
CREATE INDEX "RangeSession_expiresAt_idx" ON "RangeSession"("expiresAt");

-- CreateIndex
CREATE INDEX "RangeLoginAttempt_phoneHash_createdAt_idx" ON "RangeLoginAttempt"("phoneHash", "createdAt");

-- CreateIndex
CREATE INDEX "RangeLoginAttempt_ipHash_createdAt_idx" ON "RangeLoginAttempt"("ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "RangeAudit_locationId_createdAt_idx" ON "RangeAudit"("locationId", "createdAt");

-- CreateIndex
CREATE INDEX "RangeAudit_entityId_idx" ON "RangeAudit"("entityId");

-- AddForeignKey
ALTER TABLE "RangeMembership" ADD CONSTRAINT "RangeMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RangeUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeMembership" ADD CONSTRAINT "RangeMembership_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "RangeLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeSession" ADD CONSTRAINT "RangeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RangeUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeAudit" ADD CONSTRAINT "RangeAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "RangeUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeAudit" ADD CONSTRAINT "RangeAudit_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "RangeLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Only the initial location is seeded; credentials are provisioned separately.
INSERT INTO "RangeLocation" ("id", "name", "slug") VALUES ('range-zirakpur', 'Zirakpur', 'zirakpur');
ALTER TABLE "RangeUser" ADD CONSTRAINT "RangeUser_role_check" CHECK ("role" IN ('owner', 'coach'));

