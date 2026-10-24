-- Withdraw the event from public listings and close all public registration paths.
-- Keep existing registrations, payments, and results available to administrators.
UPDATE "Competition"
SET "isPublished" = false,
    "registrationOpen" = false,
    "resultsPublished" = false,
    "status" = 'closed',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'nehra-memorial-2026';
