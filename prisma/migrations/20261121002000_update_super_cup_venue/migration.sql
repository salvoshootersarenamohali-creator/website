UPDATE "Competition"
SET "venue" = 'HKM Shooting Arena, Patiala',
    "description" = replace("description", 'in Chandigarh, with', 'at HKM Shooting Arena, Patiala, with'),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'super-cup-2026';
