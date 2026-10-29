ALTER TABLE "RangeUser" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "RangeUser" ADD COLUMN "username" TEXT;

CREATE UNIQUE INDEX "RangeUser_username_key" ON "RangeUser"("username");

ALTER TABLE "RangeUser" ADD CONSTRAINT "RangeUser_login_identity_check"
    CHECK ("phone" IS NOT NULL OR "username" IS NOT NULL);
ALTER TABLE "RangeUser" ADD CONSTRAINT "RangeUser_username_format_check"
    CHECK ("username" IS NULL OR "username" ~ '^[a-z][a-z0-9._-]{2,31}$');
