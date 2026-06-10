CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortTitle" TEXT NOT NULL,
    "description" TEXT,
    "venue" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "competitionYear" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "registrationOpen" BOOLEAN NOT NULL DEFAULT false,
    "resultsPublished" BOOLEAN NOT NULL DEFAULT false,
    "paymentQrPath" TEXT,
    "heroImagePath" TEXT,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Competition_slug_key" ON "Competition"("slug");
CREATE INDEX "Competition_status_idx" ON "Competition"("status");
CREATE INDEX "Competition_isPublished_idx" ON "Competition"("isPublished");
CREATE INDEX "Competition_registrationOpen_idx" ON "Competition"("registrationOpen");
CREATE INDEX "Competition_resultsPublished_idx" ON "Competition"("resultsPublished");
CREATE INDEX "Competition_startDate_idx" ON "Competition"("startDate");

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
    '36th-salvo-cup',
    '36th-salvo-cup',
    '36th Salvo Cup',
    '36th Salvo Cup',
    'Three days of precision shooting at Salvo Shooters Arena.',
    'Salvo Shooters Arena, Sector 86, Mohali',
    '2026-06-05T00:00:00.000Z',
    '2026-06-07T00:00:00.000Z',
    2026,
    'open',
    true,
    true,
    true,
    '/upi-scanner.png',
    '/competition-range.JPG',
    '{
      "competitionYear": 2026,
      "entryFee": 1000,
      "littleChampEntryFee": 800,
      "events": [
        { "id": "issf-air-pistol", "discipline": "pistol", "ruleSet": "ISSF", "title": "ISSF Air Pistol", "prizes": [7100, 5100, 3100] },
        { "id": "issf-air-rifle", "discipline": "rifle", "ruleSet": "ISSF", "title": "ISSF Air Rifle", "prizes": [5100, 3100, 2100] },
        { "id": "nr-air-pistol", "discipline": "pistol", "ruleSet": "NR", "title": "NR Air Pistol", "prizes": [5100, 3100, 2100] },
        { "id": "nr-air-rifle", "discipline": "rifle", "ruleSet": "NR", "title": "NR Air Rifle", "prizes": [5100, 3100, 2100] }
      ],
      "slotOptions": [
        { "date": "2026-06-05", "label": "June 5, 2026", "slots": ["8:00 AM - 11:00 AM", "11:00 AM - 2:00 PM", "2:00 PM - 5:00 PM", "5:00 PM - 8:00 PM"] },
        { "date": "2026-06-06", "label": "June 6, 2026", "slots": ["8:00 AM - 11:00 AM", "11:00 AM - 2:00 PM", "2:00 PM - 5:00 PM", "5:00 PM - 8:00 PM"] },
        { "date": "2026-06-07", "label": "June 7, 2026", "slots": ["8:00 AM - 11:00 AM", "11:00 AM - 2:00 PM", "2:00 PM - 4:00 PM"] }
      ]
    }'::jsonb
)
ON CONFLICT ("slug") DO NOTHING;

ALTER TABLE "Registration" ADD COLUMN "competitionId" TEXT;

UPDATE "Registration"
SET "competitionId" = '36th-salvo-cup'
WHERE "competitionId" IS NULL;

ALTER TABLE "Registration" ALTER COLUMN "competitionId" SET NOT NULL;

CREATE INDEX "Registration_competitionId_idx" ON "Registration"("competitionId");

ALTER TABLE "Registration"
ADD CONSTRAINT "Registration_competitionId_fkey"
FOREIGN KEY ("competitionId") REFERENCES "Competition"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
