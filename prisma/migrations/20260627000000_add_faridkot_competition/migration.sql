ALTER TABLE "Registration" ADD COLUMN IF NOT EXISTS "motherName" TEXT;
ALTER TABLE "Registration" ADD COLUMN IF NOT EXISTS "fatherName" TEXT;
ALTER TABLE "Registration" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Registration" ADD COLUMN IF NOT EXISTS "birthCertificatePath" TEXT;
ALTER TABLE "Registration" ADD COLUMN IF NOT EXISTS "aadhaarCardPath" TEXT;

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
) VALUES (
    'faridkot-2026-27',
    'faridkot-2026-27',
    'Faridkot 10m Air Rifle / Air Pistol Shooting Championship 2026',
    'DRSA Faridkot 2026-27',
    'District Rifle Shooting Association Faridkot championship at the Govt. Shooting Range, In Stadium, Faridkot.',
    'Govt. Shooting Range, In Stadium, Faridkot',
    '2026-06-29T00:00:00.000Z',
    '2026-06-29T00:00:00.000Z',
    2026,
    'open',
    true,
    true,
    false,
    NULL,
    '/competition-range.JPG',
    '{
      "competitionYear": 2026,
      "entryFee": 1000,
      "littleChampEntryFee": 800,
      "feesByRuleSet": { "NR": 800, "ISSF": 1000 },
      "allowedPaymentModes": ["cash"],
      "noCashPrizes": true,
      "awardsNote": "Medals will be awarded to the top 3 shooters in each category. No cash prizes are there.",
      "matchStartTime": "8:00 AM",
      "minAge": 12,
      "requiredDocuments": { "birthCertificate": true, "aadhaarCard": true },
      "requiresGuardianDetails": true,
      "requiresAddress": true,
      "teamEntriesEnabled": false,
      "contactName": "S. Simerjeet Singh Sekhon",
      "contactPhone": "+91-9876211107",
      "detailDefaults": { "firstSightingTimes": { "NR": "07:45", "ISSF": "07:45" } },
      "rules": [
        "Matches will be conducted according to NR and ISSF rules as per the NRAI match book.",
        "NR Air Pistol and Air Rifle matches will be conducted on paper target only.",
        "ISSF Air Pistol and Air Rifle matches will be conducted on Sius electronic target.",
        "The range will strictly function according to the commands of the range officer.",
        "There will be direct disqualification in case of safety rule violation.",
        "Protest fee will be Rs. 1000 for all events."
      ],
      "registrationNotes": [
        "Only cash payments will be accepted for public registration.",
        "Shooters must attach date of birth certificate and Aadhaar card copy duly attested as applicable.",
        "The entry form must be filled and submitted with the entry fee at the shooting range.",
        "Shooters must provide their place information: school, college, shooting club, city, or village name.",
        "Shooters below the age of 12 years are not allowed to participate."
      ],
      "slotOptions": [
        { "date": "2026-06-29", "label": "June 29, 2026", "slots": ["8:00 AM"] }
      ],
      "events": [
        {
          "id": "faridkot-nr-air-rifle",
          "discipline": "rifle",
          "ruleSet": "NR",
          "title": ".177 Peep Sight Air Rifle (NR)",
          "prizes": [0, 0, 0],
          "categories": [
            { "code": "S-01", "label": ".177 Peep Sight Air Rifle (NR) 10M Senior Men Individual", "bracket": "senior", "gender": "male" },
            { "code": "S-02", "label": ".177 Peep Sight Air Rifle (NR) 10M Senior Women Individual", "bracket": "senior", "gender": "female" },
            { "code": "S-03", "label": ".177 Peep Sight Air Rifle (NR) 10M Junior Men Individual", "bracket": "junior", "gender": "male" },
            { "code": "S-04", "label": ".177 Peep Sight Air Rifle (NR) 10M Junior Women Individual", "bracket": "junior", "gender": "female" },
            { "code": "S-05", "label": ".177 Peep Sight Air Rifle (NR) 10M Youth Men Individual", "bracket": "youth", "gender": "male" },
            { "code": "S-06", "label": ".177 Peep Sight Air Rifle (NR) 10M Youth Women Individual", "bracket": "youth", "gender": "female" },
            { "code": "S-07", "label": ".177 Peep Sight Air Rifle (NR) 10M Sub Youth Men Individual", "bracket": "sub-youth", "gender": "male" },
            { "code": "S-08", "label": ".177 Peep Sight Air Rifle (NR) 10M Sub Youth Women Individual", "bracket": "sub-youth", "gender": "female" },
            { "code": "S-09", "label": ".177 Peep Sight Air Rifle (NR) 10M MQS", "bracket": "senior", "gender": "open", "appliesToAllEligible": true },
            { "code": "S-10", "label": ".177 Peep Sight Air Rifle (NR) 10M Master Men Individual", "bracket": "master", "gender": "male" },
            { "code": "S-11", "label": ".177 Peep Sight Air Rifle (NR) 10M Master Women Individual", "bracket": "master", "gender": "female" }
          ]
        },
        {
          "id": "faridkot-nr-air-pistol",
          "discipline": "pistol",
          "ruleSet": "NR",
          "title": "Air Pistol (NR)",
          "prizes": [0, 0, 0],
          "categories": [
            { "code": "S-12", "label": "Air Pistol (NR) 10M Senior Men Individual", "bracket": "senior", "gender": "male" },
            { "code": "S-13", "label": "Air Pistol (NR) 10M Senior Women Individual", "bracket": "senior", "gender": "female" },
            { "code": "S-14", "label": "Air Pistol (NR) 10M Junior Men Individual", "bracket": "junior", "gender": "male" },
            { "code": "S-15", "label": "Air Pistol (NR) 10M Junior Women Individual", "bracket": "junior", "gender": "female" },
            { "code": "S-16", "label": "Air Pistol (NR) 10M Youth Men Individual", "bracket": "youth", "gender": "male" },
            { "code": "S-17", "label": "Air Pistol (NR) 10M Youth Women Individual", "bracket": "youth", "gender": "female" },
            { "code": "S-18", "label": "Air Pistol (NR) 10M Sub Youth Men Individual", "bracket": "sub-youth", "gender": "male" },
            { "code": "S-19", "label": "Air Pistol (NR) 10M Sub Youth Women Individual", "bracket": "sub-youth", "gender": "female" },
            { "code": "S-20", "label": "Air Pistol (NR) 10M Master Men Individual", "bracket": "master", "gender": "male" },
            { "code": "S-21", "label": "Air Pistol (NR) 10M Master Women Individual", "bracket": "master", "gender": "female" },
            { "code": "S-82", "label": "Air Pistol MQS", "bracket": "senior", "gender": "open", "appliesToAllEligible": true }
          ]
        },
        {
          "id": "faridkot-issf-air-rifle",
          "discipline": "rifle",
          "ruleSet": "ISSF",
          "title": ".177 Peep Sight Air Rifle (ISSF)",
          "prizes": [0, 0, 0],
          "categories": [
            { "code": "S-22", "label": ".177 Peep Sight Air Rifle (ISSF) 10M Senior Men Individual", "bracket": "senior", "gender": "male" },
            { "code": "S-23", "label": ".177 Peep Sight Air Rifle (ISSF) 10M Senior Women Individual", "bracket": "senior", "gender": "female" },
            { "code": "S-24", "label": ".177 Peep Sight Air Rifle (ISSF) 10M Junior Men Individual", "bracket": "junior", "gender": "male" },
            { "code": "S-25", "label": ".177 Peep Sight Air Rifle (ISSF) 10M Junior Women Individual", "bracket": "junior", "gender": "female" },
            { "code": "S-26", "label": ".177 Peep Sight Air Rifle (ISSF) 10M Youth Men Individual", "bracket": "youth", "gender": "male" },
            { "code": "S-27", "label": ".177 Peep Sight Air Rifle (ISSF) 10M Youth Women Individual", "bracket": "youth", "gender": "female" },
            { "code": "S-28", "label": ".177 Peep Sight Air Rifle (ISSF) 10M Sub Youth Men Individual", "bracket": "sub-youth", "gender": "male" },
            { "code": "S-29", "label": ".177 Peep Sight Air Rifle (ISSF) 10M Sub Youth Women Individual", "bracket": "sub-youth", "gender": "female" },
            { "code": "S-30", "label": ".177 Peep Sight Air Rifle (ISSF) 10M Master Men Individual", "bracket": "master", "gender": "male" },
            { "code": "S-31", "label": ".177 Peep Sight Air Rifle (ISSF) 10M Master Women Individual", "bracket": "master", "gender": "female" }
          ]
        },
        {
          "id": "faridkot-issf-air-pistol",
          "discipline": "pistol",
          "ruleSet": "ISSF",
          "title": "Air Pistol (ISSF)",
          "prizes": [0, 0, 0],
          "categories": [
            { "code": "S-32", "label": "Air Pistol (ISSF) 10M Senior Men Individual", "bracket": "senior", "gender": "male" },
            { "code": "S-33", "label": "Air Pistol (ISSF) 10M Senior Women Individual", "bracket": "senior", "gender": "female" },
            { "code": "S-34", "label": "Air Pistol (ISSF) 10M Junior Men Individual", "bracket": "junior", "gender": "male" },
            { "code": "S-35", "label": "Air Pistol (ISSF) 10M Junior Women Individual", "bracket": "junior", "gender": "female" },
            { "code": "S-36", "label": "Air Pistol (ISSF) 10M Youth Men Individual", "bracket": "youth", "gender": "male" },
            { "code": "S-37", "label": "Air Pistol (ISSF) 10M Youth Women Individual", "bracket": "youth", "gender": "female" },
            { "code": "S-38", "label": "Air Pistol (ISSF) 10M Sub Youth Men Individual", "bracket": "sub-youth", "gender": "male" },
            { "code": "S-39", "label": "Air Pistol (ISSF) 10M Sub Youth Women Individual", "bracket": "sub-youth", "gender": "female" },
            { "code": "S-40", "label": "Air Pistol (ISSF) 10M Master Men Individual", "bracket": "master", "gender": "male" },
            { "code": "S-41", "label": "Air Pistol (ISSF) 10M Master Women Individual", "bracket": "master", "gender": "female" }
          ]
        }
      ]
    }'::jsonb
)
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
    "paymentQrPath" = EXCLUDED."paymentQrPath",
    "heroImagePath" = EXCLUDED."heroImagePath",
    "config" = EXCLUDED."config",
    "updatedAt" = CURRENT_TIMESTAMP;
