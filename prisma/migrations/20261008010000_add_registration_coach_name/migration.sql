ALTER TABLE "Registration" ADD COLUMN "coachName" TEXT;

UPDATE "Competition"
SET
    "config" = jsonb_set("config", '{requiresCoachName}', 'true'::jsonb),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = '1st-bharat-cup';
