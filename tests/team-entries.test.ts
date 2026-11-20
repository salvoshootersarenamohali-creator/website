import { describe, expect, it } from "vitest"
import { IncomingTeamEntryData, TeamValidationRegistration, normalizeTeamEntryData, resolveTeamEntry, supportsMixedTeamEntries } from "@/lib/team-entries"

const competitionId = "competition-1"

const registrations: TeamValidationRegistration[] = [1, 2, 3].map((number) => ({
    id: `registration-${number}`,
    competitionId,
    name: `Shooter ${number}`,
    academy: "Salvo Club",
    gender: number === 2 ? "female" : "male",
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

describe("mixed team entries", () => {
    const mixedData: IncomingTeamEntryData = { ...teamData, name: "", teamType: "mixed", members: teamData.members.slice(0, 2) }
    const mixedOptions = { mixedTeamsEnabled: true }

    it.each(["pistol", "rifle"])("accepts one male and one female with individual %s entries from different clubs", (discipline) => {
        const students = registrations.slice(0, 2).map((registration, index) => ({
            ...registration,
            academy: index === 0 ? "Salvo Club" : "Other Club",
            entries: registration.entries.map((entry) => ({ ...entry, discipline })),
        }))
        const result = resolveTeamEntry({ ...mixedData, discipline }, competitionId, students, 1200, mixedOptions)

        expect(result).toMatchObject({ teamType: "mixed", discipline, academy: "Salvo Club / Other Club", amount: 1200 })
        expect(result.name).toContain("Mixed Team")
        expect(result.members.map((member) => member.registration.gender)).toEqual(["male", "female"])
    })

    it("accepts a pair from the same club and either member order", () => {
        const result = resolveTeamEntry({ ...mixedData, members: [...mixedData.members].reverse() }, competitionId, registrations, 900, mixedOptions)
        expect(result.academy).toBe("Salvo Club")
        expect(result.members).toHaveLength(2)
    })

    it.each(["male", "female", ""])("rejects a pair whose genders are both %s", (gender) => {
        const students = registrations.map((registration) => ({ ...registration, gender }))
        expect(() => resolveTeamEntry(mixedData, competitionId, students, 900, mixedOptions)).toThrow("one male and one female")
    })

    it.each([1, 3])("rejects %i members", (count) => {
        expect(() => resolveTeamEntry({ ...mixedData, members: teamData.members.slice(0, count) }, competitionId, registrations, 900, mixedOptions)).toThrow("exactly 2")
    })

    it("rejects a duplicate student, including different entries for the same student", () => {
        const students = [{ ...registrations[0], entries: [registrations[0].entries[0], { ...registrations[0].entries[0], id: "another-entry" }] }]
        const members = [mixedData.members[0], { ...mixedData.members[0], registrationEntryId: "another-entry" }]
        expect(() => resolveTeamEntry({ ...mixedData, members }, competitionId, students, 900, mixedOptions)).toThrow("2 different students")
    })

    it("rejects a member in another discipline", () => {
        const students = registrations.map((registration, index) => index === 1 ? { ...registration, entries: [{ ...registration.entries[0], discipline: "rifle" }] } : registration)
        expect(() => resolveTeamEntry(mixedData, competitionId, students, 900, mixedOptions)).toThrow("individual Pistol entry")
    })

    it("rejects an entry that does not belong to its selected student", () => {
        const members = [mixedData.members[0], { ...mixedData.members[1], registrationEntryId: registrations[0].entries[0].id }]
        expect(() => resolveTeamEntry({ ...mixedData, members }, competitionId, registrations, 900, mixedOptions)).toThrow("selected individual entry")
    })

    it("rejects a student from another competition", () => {
        const students = registrations.map((registration, index) => index === 1 ? { ...registration, competitionId: "other" } : registration)
        expect(() => resolveTeamEntry(mixedData, competitionId, students, 900, mixedOptions)).toThrow("not registered for this competition")
    })

    it("only enables mixed teams for Super Cup", () => {
        expect(supportsMixedTeamEntries("super-cup-2026")).toBe(true)
        expect(supportsMixedTeamEntries("38th-salvo-cup")).toBe(false)
        expect(() => resolveTeamEntry(mixedData, competitionId, registrations)).toThrow("not enabled")
    })

    it("keeps legacy requests as standard teams with three students from one club", () => {
        const data = normalizeTeamEntryData(teamData)
        expect(data.teamType).toBe("standard")
        expect(resolveTeamEntry(data, competitionId, registrations, 900, mixedOptions).teamType).toBe("standard")
        expect(() => resolveTeamEntry({ ...data, members: data.members.slice(0, 2) }, competitionId, registrations)).toThrow("exactly 3")
        const students = registrations.map((registration, index) => index === 1 ? { ...registration, academy: "Other Club" } : registration)
        expect(() => resolveTeamEntry(data, competitionId, students)).toThrow("same shooting club")
    })

    it("rejects unknown team types and keeps team payment validation", () => {
        expect(() => resolveTeamEntry({ ...mixedData, teamType: "other" }, competitionId, registrations, 900, mixedOptions)).toThrow("Select a standard team or mixed team")
        expect(() => resolveTeamEntry({ ...mixedData, paymentMode: "upi", paymentStatus: "Sponsored" }, competitionId, registrations, 900, mixedOptions)).toThrow("Sponsored team entries must use cash")
    })
})
