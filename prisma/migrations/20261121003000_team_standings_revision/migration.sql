-- Team scores use RegistrationEntry, which already advances the results revision.
-- Roster changes must also wake clients polling with the previous ETag.
CREATE FUNCTION touch_team_result_competition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_TABLE_NAME = 'TeamEntry' THEN
        UPDATE "Competition" SET "updatedAt" = clock_timestamp()
        WHERE id IN (OLD."competitionId", NEW."competitionId");
    ELSE
        UPDATE "Competition" SET "updatedAt" = clock_timestamp()
        WHERE id IN (
            SELECT "competitionId" FROM "TeamEntry"
            WHERE id IN (OLD."teamEntryId", NEW."teamEntryId")
        );
    END IF;
    RETURN NULL;
END $$;

CREATE TRIGGER team_results_revision AFTER INSERT OR DELETE OR UPDATE OF name, academy, discipline, "teamType", "competitionId"
ON "TeamEntry" FOR EACH ROW EXECUTE FUNCTION touch_team_result_competition();

CREATE TRIGGER team_member_results_revision AFTER INSERT OR DELETE OR UPDATE OF "teamEntryId", "registrationEntryId"
ON "TeamEntryMember" FOR EACH ROW EXECUTE FUNCTION touch_team_result_competition();
