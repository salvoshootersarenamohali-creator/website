import { describe, expect, it } from "vitest"
import { IncomingTeamEntryData, TeamValidationRegistration, resolveTeamEntry } from "@/lib/team-entries"

const competitionId = "competition-1"

const registrations: TeamValidationRegistration[] = [1, 2, 3].map((number) => ({
    id: `registration-${number}`,
    competitionId,
    name: `Shooter ${number}`,
    academy: "Salvo Club",
    entries: [{
        id: `entry-${number}`,
        discipline: "pistol",
        categoryCode: `S-${number}`,
        categoryLabel: `Pistol Category ${number}`,
    }],
}))

const teamData: IncomingTeamEntryData = {
    name: "Salvo Pistol Team",
    discipline: "pistol",
    paymentMode: "cash",
    paymentStatus: "Pending",
    members: registrations.map((registration) => ({
        registrationId: registration.id,
        registrationEntryId: registration.entries[0].id,
    })),
}

describe("team entry fees", () => {
    it("uses the fee configured for the competition", () => {
        expect(resolveTeamEntry(teamData, competitionId, registrations, 1250).amount).toBe(1250)
    })

    it("does not retroactively change an already resolved team amount", () => {
        const existingTeam = resolveTeamEntry(teamData, competitionId, registrations, 900)
        const laterTeam = resolveTeamEntry(teamData, competitionId, registrations, 1400)

        expect(existingTeam.amount).toBe(900)
        expect(laterTeam.amount).toBe(1400)
    })
})
