BEGIN;
ALTER TABLE "RangeShift" DROP CONSTRAINT "RangeShift_open_check";
ALTER TABLE "RangeShift" ADD CONSTRAINT "RangeShift_open_check" CHECK (
    ("outAt" IS NULL AND "openKey" IS NOT NULL AND "openKey" = "userId")
    OR ("outAt" IS NOT NULL AND "openKey" IS NULL)
);
COMMIT;
