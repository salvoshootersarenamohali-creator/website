UPDATE "Competition"
SET
    "config" = jsonb_set(
        jsonb_set(
            "config",
            '{feesByRuleSet}',
            '{ "NR": null, "ISSF": null }'::jsonb,
            true
        ),
        '{minAge}',
        'null'::jsonb,
        true
    ),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = '37th-salvo-cup'
  AND COALESCE("config"#>'{feesByRuleSet,NR}', 'null'::jsonb) IN ('null'::jsonb, '0'::jsonb, '"0"'::jsonb)
  AND COALESCE("config"#>'{feesByRuleSet,ISSF}', 'null'::jsonb) IN ('null'::jsonb, '0'::jsonb, '"0"'::jsonb);

UPDATE "RegistrationEntry" AS entry
SET
    "fee" = CASE
        WHEN entry."categoryLabel" ILIKE '%little champ%'
          OR entry."categoryCode" ~ '^[RS]-(19|20|21|22|25|26|27|28)$'
        THEN 800
        ELSE 1000
    END,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Registration" AS registration
JOIN "Competition" AS competition
  ON competition."id" = registration."competitionId"
WHERE entry."registrationId" = registration."id"
  AND competition."slug" = '37th-salvo-cup'
  AND entry."fee" = 0;

UPDATE "Registration" AS registration
SET
    "amount" = totals."amount",
    "updatedAt" = CURRENT_TIMESTAMP
FROM (
    SELECT
        entry."registrationId",
        SUM(entry."fee")::integer AS "amount"
    FROM "RegistrationEntry" AS entry
    GROUP BY entry."registrationId"
) AS totals,
"Competition" AS competition
WHERE totals."registrationId" = registration."id"
  AND competition."id" = registration."competitionId"
  AND competition."slug" = '37th-salvo-cup';
