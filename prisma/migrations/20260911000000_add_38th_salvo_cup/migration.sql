INSERT INTO "Competition" (
    "id",
    "slug",
    "title",
    "shortTitle",
    "description",
    "venue",
    "startDate",
    "endDate",
    "competitionYear",
    "status",
    "isPublished",
    "registrationOpen",
    "resultsPublished",
    "paymentQrPath",
    "heroImagePath",
    "config"
)
SELECT
    '38th-salvo-cup',
    '38th-salvo-cup',
    '38th Salvo Cup',
    '38th Salvo Cup',
    'Three days of Air Pistol and Air Rifle competition at Salvo Shooters Arena.',
    'Salvo Shooters Arena, Sector 86, Mohali',
    '2026-09-25T00:00:00.000Z',
    '2026-09-27T00:00:00.000Z',
    2026,
    'open',
    true,
    true,
    false,
    "paymentQrPath",
    '/38th-salvo-cup-poster.jpg',
    jsonb_set(
        "config",
        '{slotOptions}',
        '[
          { "date": "2026-09-25", "label": "25th September 2026", "slots": ["8:00 AM - 11:00 AM", "11:00 AM - 2:00 PM", "2:00 PM - 5:00 PM", "5:00 PM - 8:00 PM"] },
          { "date": "2026-09-26", "label": "26th September 2026", "slots": ["8:00 AM - 11:00 AM", "11:00 AM - 2:00 PM", "2:00 PM - 5:00 PM", "5:00 PM - 8:00 PM"] },
          { "date": "2026-09-27", "label": "27th September 2026", "slots": ["8:00 AM - 11:00 AM", "11:00 AM - 2:00 PM", "2:00 PM - 4:00 PM"] }
        ]'::jsonb,
        true
    )
FROM "Competition"
WHERE "slug" = '37th-salvo-cup'
ON CONFLICT ("slug") DO UPDATE SET
    "title" = EXCLUDED."title",
    "shortTitle" = EXCLUDED."shortTitle",
    "description" = EXCLUDED."description",
    "venue" = EXCLUDED."venue",
    "startDate" = EXCLUDED."startDate",
    "endDate" = EXCLUDED."endDate",
    "competitionYear" = EXCLUDED."competitionYear",
    "status" = EXCLUDED."status",
    "isPublished" = EXCLUDED."isPublished",
    "registrationOpen" = EXCLUDED."registrationOpen",
    "resultsPublished" = EXCLUDED."resultsPublished",
    "paymentQrPath" = EXCLUDED."paymentQrPath",
    "heroImagePath" = EXCLUDED."heroImagePath",
    "config" = EXCLUDED."config",
    "updatedAt" = CURRENT_TIMESTAMP;
