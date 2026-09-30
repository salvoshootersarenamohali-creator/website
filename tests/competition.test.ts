import { describe, expect, it } from "vitest"
import {
    buildCompetitionSlotsForDateRange,
    formatCompetitionDateLabel,
    getScoringSeriesCount,
    parseCompetitionDate,
} from "@/lib/competition"

describe("competition scoring format", () => {
    it("uses four ten-shot series for every Little Champ category", () => {
        expect(getScoringSeriesCount("NR", { bracket: "little-standing" })).toBe(4)
        expect(getScoringSeriesCount("NR", { bracket: "little-sitting" })).toBe(4)
        expect(getScoringSeriesCount("NR", { categoryLabel: "NR Air Pistol Little Champ Boys" })).toBe(4)
        expect(getScoringSeriesCount("NR", { categoryCode: "R-28" })).toBe(4)
    })

    it("keeps the existing series counts for other categories", () => {
        expect(getScoringSeriesCount("NR", { bracket: "senior" })).toBe(4)
        expect(getScoringSeriesCount("ISSF", { bracket: "senior" })).toBe(6)
    })
})

describe("competition schedule", () => {
    it("builds one relay day for every day in the selected range", () => {
        const slots = buildCompetitionSlotsForDateRange("2027-02-27", "2027-03-01")

        expect(slots.map((slot) => slot.date)).toEqual([
            "2027-02-27",
            "2027-02-28",
            "2027-03-01",
        ])
        expect(slots.map((slot) => slot.label)).toEqual([
            "27 February 2027",
            "28 February 2027",
            "1 March 2027",
        ])
        expect(slots.every((slot) => slot.slots.length > 0)).toBe(true)
    })

    it("preserves configured slots when a date remains in the range", () => {
        const slots = buildCompetitionSlotsForDateRange("2026-09-26", "2026-09-27", [
            { date: "2026-09-26", label: "Old label", slots: ["9:00 AM - 10:00 AM"] },
        ])

        expect(slots[0]).toEqual({
            date: "2026-09-26",
            label: "26 September 2026",
            slots: ["9:00 AM - 10:00 AM"],
        })
    })

    it("rejects invalid or reversed dates", () => {
        expect(parseCompetitionDate("2026-02-30")).toBeNull()
        expect(formatCompetitionDateLabel("not-a-date")).toBe("")
        expect(buildCompetitionSlotsForDateRange("2026-09-27", "2026-09-25")).toEqual([])
    })
})
