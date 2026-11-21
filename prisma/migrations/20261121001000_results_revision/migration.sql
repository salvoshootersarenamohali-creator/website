-- The competition timestamp is also the revision of its public results feed.
-- Advance it in the same transaction as a roster or score change.
CREATE FUNCTION advance_competition_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW."updatedAt" := GREATEST(NEW."updatedAt", OLD."updatedAt" + interval '1 millisecond');
    RETURN NEW;
END $$;
CREATE TRIGGER competition_revision BEFORE UPDATE ON "Competition"
FOR EACH ROW EXECUTE FUNCTION advance_competition_revision();

CREATE FUNCTION touch_result_competition() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event_id text;
BEGIN
    IF TG_TABLE_NAME = 'Registration' THEN
        event_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."competitionId" ELSE NEW."competitionId" END;
    ELSE
        SELECT "competitionId" INTO event_id FROM "Registration"
        WHERE id = CASE WHEN TG_OP = 'DELETE' THEN OLD."registrationId" ELSE NEW."registrationId" END;
    END IF;
    UPDATE "Competition" SET "updatedAt" = clock_timestamp() WHERE id = event_id;
    RETURN NULL;
END $$;
CREATE TRIGGER roster_results_revision AFTER INSERT OR DELETE OR UPDATE OF name, academy, "studentPhotoPath"
ON "Registration" FOR EACH ROW EXECUTE FUNCTION touch_result_competition();
CREATE TRIGGER entry_results_revision AFTER INSERT OR UPDATE OR DELETE
ON "RegistrationEntry" FOR EACH ROW EXECUTE FUNCTION touch_result_competition();
CREATE INDEX "RegistrationEntry_registrationId_idx" ON "RegistrationEntry"("registrationId");
