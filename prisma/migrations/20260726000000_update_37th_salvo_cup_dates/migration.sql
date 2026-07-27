UPDATE "Competition"
SET
    "description" = 'Three days of precision shooting, championship rewards, and cash prizes at Salvo Shooters Arena.',
    "startDate" = '2026-07-31T00:00:00.000Z',
    "endDate" = '2026-08-02T00:00:00.000Z',
    "heroImagePath" = '/37th-salvo-cup-hero-july-august-2026.png',
    "config" = jsonb_set(
        "config",
        '{slotOptions}',
        '[
          { "date": "2026-07-31", "label": "31st July 2026", "slots": ["8:00 AM - 11:00 AM", "11:00 AM - 2:00 PM", "2:00 PM - 5:00 PM", "5:00 PM - 8:00 PM"] },
          { "date": "2026-08-01", "label": "1st August 2026", "slots": ["8:00 AM - 11:00 AM", "11:00 AM - 2:00 PM", "2:00 PM - 5:00 PM", "5:00 PM - 8:00 PM"] },
          { "date": "2026-08-02", "label": "2nd August 2026", "slots": ["8:00 AM - 11:00 AM", "11:00 AM - 2:00 PM", "2:00 PM - 4:00 PM"] }
        ]'::jsonb,
        true
    ),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = '37th-salvo-cup';
