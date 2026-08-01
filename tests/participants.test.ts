import { describe, expect, it } from "vitest"
import { formatCompetitionDateRange, getCompetitionEndBoundary, hasCompetitionEnded } from "@/lib/competition"
import {
    buildParticipantDirectory,
    formatPosition,
    medalForRank,
    ParticipantSourceEntry,
    ParticipantSourceRegistration,
} from "@/lib/participants"

function entry(overrides: Partial<ParticipantSourceEntry> & Pick<ParticipantSourceEntry, "id" | "categoryCode">): ParticipantSourceEntry {
    const totalScore = overrides.totalScore ?? 600
    return {
        id: overrides.id,
        eventId: overrides.eventId ?? "issf-air-pistol",
        eventTitle: overrides.eventTitle ?? "ISSF Air Pistol",
        categoryCode: overrides.categoryCode,
        categoryLabel: overrides.categoryLabel ?? "Senior Men",
        ruleSet: overrides.ruleSet ?? "ISSF",
        seriesScores: overrides.seriesScores ?? [100, 100, 100, 100, 100, totalScore - 500],
        innerTenCount: overrides.innerTenCount ?? 10,
        totalScore,
        isPara: overrides.isPara ?? false,
    }
}

function registration(id: string, name: string, entries: ParticipantSourceEntry[]): ParticipantSourceRegistration {
    return { id, name, academy: `${name} Academy`, entries }
}

describe("certificate release boundary", () => {
    it("stays locked until the day after the configured end date", () => {
        const endDate = "2026-08-02T00:00:00.000Z"
        expect(getCompetitionEndBoundary(endDate)?.toISOString()).toBe("2026-08-03T00:00:00.000Z")
        expect(hasCompetitionEnded(endDate, new Date("2026-08-02T23:59:59.999Z"))).toBe(false)
        expect(hasCompetitionEnded(endDate, new Date("2026-08-03T00:00:00.000Z"))).toBe(true)
    })

    it("formats stored date-only UTC values without shifting days", () => {
        expect(formatCompetitionDateRange("2026-07-31T00:00:00.000Z", "2026-08-02T00:00:00.000Z")).toBe("31 Jul - 2 Aug 2026")
    })
})

describe("participant directory", () => {
    it("excludes registrations without a complete score", () => {
        const directory = buildParticipantDirectory([
            registration("eligible", "Eligible Shooter", [entry({ id: "complete", categoryCode: "S-01" })]),
            registration("pending", "Pending Shooter", [entry({ id: "partial", categoryCode: "S-01", seriesScores: [100, 100] })]),
        ], "salvo-cup")

        expect(directory.uniqueParticipantCount).toBe(1)
        expect(directory.participants.map((participant) => participant.registrationId)).toEqual(["eligible"])
    })

    it("keeps regular and para rankings separate even when category codes match", () => {
        const directory = buildParticipantDirectory([
            registration("regular", "Regular Shooter", [entry({ id: "regular-entry", categoryCode: "S-01", totalScore: 580 })]),
            registration("para", "Para Shooter", [entry({ id: "para-entry", categoryCode: "S-01", totalScore: 570, isPara: true })]),
        ], "salvo-cup")

        expect(directory.regularCategories).toHaveLength(1)
        expect(directory.paraCategories).toHaveLength(1)
        expect(directory.regularCategories[0].participants[0].categoryEntry.rank).toBe(1)
        expect(directory.paraCategories[0].participants[0].categoryEntry.rank).toBe(1)
    })

    it("repeats a multi-category participant while keeping one combined certificate", () => {
        const directory = buildParticipantDirectory([
            registration("multi", "Multi Shooter", [
                entry({ id: "s1", categoryCode: "S-01", totalScore: 600 }),
                entry({ id: "s2", categoryCode: "S-02", totalScore: 590 }),
            ]),
            registration("other-1", "Other One", [entry({ id: "o1", categoryCode: "S-01", totalScore: 580 })]),
            registration("other-2", "Other Two", [entry({ id: "o2", categoryCode: "S-02", totalScore: 570 })]),
        ], "salvo-cup")

        const multi = directory.participants.find((participant) => participant.registrationId === "multi")
        expect(directory.categories).toHaveLength(2)
        expect(directory.categories.every((category) => category.participants.some((participant) => participant.registrationId === "multi"))).toBe(true)
        expect(multi?.entries).toHaveLength(2)
        expect(multi?.medalCount).toBe(2)
        expect(new Set(directory.categories.flatMap((category) => category.participants.filter((participant) => participant.registrationId === "multi").map((participant) => participant.certificateUrl))).size).toBe(1)
    })

    it("preserves official tied ranks and medal mapping", () => {
        const tied = entry({ id: "tie-a", categoryCode: "S-01", totalScore: 590, innerTenCount: 12, seriesScores: [98, 98, 98, 98, 99, 99] })
        const directory = buildParticipantDirectory([
            registration("first", "First Shooter", [entry({ id: "first-entry", categoryCode: "S-01", totalScore: 600 })]),
            registration("tie-a", "Tie A", [tied]),
            registration("tie-b", "Tie B", [{ ...tied, id: "tie-b" }]),
            registration("fourth", "Fourth Shooter", [entry({ id: "fourth-entry", categoryCode: "S-01", totalScore: 580 })]),
        ], "salvo-cup")

        const ranks = Object.fromEntries(directory.categories[0].participants.map((participant) => [participant.registrationId, participant.categoryEntry.rank]))
        expect(ranks).toMatchObject({ first: 1, "tie-a": 2, "tie-b": 2, fourth: 4 })
        expect(medalForRank(1)).toBe("gold")
        expect(medalForRank(2)).toBe("silver")
        expect(medalForRank(3)).toBe("bronze")
        expect(medalForRank(4)).toBeNull()
        expect(formatPosition(11)).toBe("11th")
        expect(formatPosition(22)).toBe("22nd")
    })

    it("has no certificate match for an unknown or unscored registration id", () => {
        const directory = buildParticipantDirectory([
            registration("eligible", "Eligible Shooter", [entry({ id: "complete", categoryCode: "S-01" })]),
            registration("unscored", "Unscored Shooter", [entry({ id: "partial", categoryCode: "S-02", seriesScores: [] })]),
        ], "salvo-cup")

        expect(directory.participants.find((participant) => participant.registrationId === "missing")).toBeUndefined()
        expect(directory.participants.find((participant) => participant.registrationId === "unscored")).toBeUndefined()
    })
})
