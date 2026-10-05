CREATE TABLE "RegistrationDocument" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "documentKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistrationDocument_registrationId_documentKey_key"
ON "RegistrationDocument"("registrationId", "documentKey");

CREATE INDEX "RegistrationDocument_registrationId_idx"
ON "RegistrationDocument"("registrationId");

ALTER TABLE "RegistrationDocument"
ADD CONSTRAINT "RegistrationDocument_registrationId_fkey"
FOREIGN KEY ("registrationId") REFERENCES "Registration"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "RegistrationDocument" ("id", "registrationId", "documentKey", "label", "path", "mimeType", "position", "createdAt")
SELECT "id" || '-birth-certificate', "id", 'birth-certificate', 'Date of Birth Certificate', "birthCertificatePath", 'application/octet-stream', 0, "createdAt"
FROM "Registration"
WHERE "birthCertificatePath" IS NOT NULL;

INSERT INTO "RegistrationDocument" ("id", "registrationId", "documentKey", "label", "path", "mimeType", "position", "createdAt")
SELECT "id" || '-aadhaar-card', "id", 'aadhaar-card', 'Aadhaar Card Copy', "aadhaarCardPath", 'application/octet-stream', 1, "createdAt"
FROM "Registration"
WHERE "aadhaarCardPath" IS NOT NULL;
