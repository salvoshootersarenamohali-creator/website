UPDATE "Competition"
SET
    "config" = jsonb_set("config", '{allowedPaymentModes}', '["upi"]'::jsonb),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = '1st-bharat-cup';
