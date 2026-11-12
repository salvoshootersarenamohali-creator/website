UPDATE "Competition"
SET
    "config" = jsonb_set(
        jsonb_set("config", '{requiresCoachName}', 'true'::jsonb),
        '{slotOptions}',
        (
            SELECT jsonb_agg(
                CASE WHEN day->>'date' = '2026-11-22'
                    THEN jsonb_set(day, '{slots}', '[]'::jsonb)
                    ELSE day
                END ORDER BY position
            )
            FROM jsonb_array_elements("config"->'slotOptions') WITH ORDINALITY AS schedule(day, position)
        )
    ),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'super-cup-2026'
    AND "config"->'slotOptions' @> '[{"date":"2026-11-22"}]'::jsonb;
