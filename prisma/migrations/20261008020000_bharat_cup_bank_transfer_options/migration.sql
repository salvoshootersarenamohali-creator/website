UPDATE "Competition"
SET
    "config" = "config" || jsonb_build_object(
        'allowedPaymentModes', jsonb_build_array('upi', 'neft', 'imps', 'rtgs'),
        'paymentDetails', jsonb_build_object(
            'upiId', '9315189722m@pnb',
            'accountName', 'NEXTZEN SPORTS',
            'accountNumber', '2247002100003586',
            'ifsc', 'PUNB0224700',
            'bankName', 'Punjab National Bank'
        )
    ),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = '1st-bharat-cup';
