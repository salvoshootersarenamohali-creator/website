ALTER TABLE "Registration"
    ADD COLUMN "isService" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "cardKey" UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX "Registration_cardKey_key" ON "Registration"("cardKey");
