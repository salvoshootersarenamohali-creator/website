-- Existing competitions intentionally keep a null digest and remain master-PIN-only
-- until a competition-specific PIN is assigned in the competition manager.
ALTER TABLE "Competition" ADD COLUMN "adminPinDigest" TEXT;

CREATE UNIQUE INDEX "Competition_adminPinDigest_key" ON "Competition"("adminPinDigest");
