UPDATE "Competition"
SET
    "registrationOpen" = true,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = '38th-salvo-cup';
