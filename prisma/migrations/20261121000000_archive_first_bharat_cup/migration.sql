UPDATE "Competition"
SET "status" = 'archived', "isPublished" = false, "registrationOpen" = false,
    "resultsPublished" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = '1st-bharat-cup';
