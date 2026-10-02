import { describe, expect, it } from "vitest"
import {
    buildCompetitionSlotsForDateRange,
    defaultCompetitionConfig,
    formatCompetitionDateLabel,
    getCategoryCashPrizes,
    getCompetitionCategories,
    getScoringSeriesCount,
    normalizeCompetitionConfig,
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

describe("competition cash prizes", () => {
    it("normalizes legacy prize settings without changing their behavior", () => {
        expect(normalizeCompetitionConfig({ noCashPrizes: false }).cashPrizeMode).toBe("event-wide")

        const noCashConfig = normalizeCompetitionConfig({ noCashPrizes: true })
        expect(noCashConfig.cashPrizeMode).toBe("none")
        expect(noCashConfig.noCashPrizes).toBe(true)
        expect(noCashConfig.teamEntryFee).toBe(900)
        expect(normalizeCompetitionConfig({ teamEntryFee: 0 }).teamEntryFee).toBe(0)
        expect(normalizeCompetitionConfig({ teamEntryFee: -1 }).teamEntryFee).toBe(900)
    })

    it("keeps valid category prizes and ignores malformed prize rows", () => {
        const event = defaultCompetitionConfig.events.find((candidate) => candidate.id === "nr-air-pistol")!
        const config = normalizeCompetitionConfig({
            ...defaultCompetitionConfig,
            cashPrizeMode: "category-specific",
            teamEntryFee: 1200,
            events: [{
                ...event,
                categoryPrizes: {
                    "S-19": [5000, 3000, 1000],
                    "S-20": [1000, 500],
                    "S-21": [-1, 500, 250],
                },
            }],
        })

        expect(config.teamEntryFee).toBe(1200)
        expect(config.events[0].categoryPrizes).toEqual({ "S-19": [5000, 3000, 1000] })
    })

    it("lists generated Little Champ categories and preserves custom categories", () => {
        const nrEvent = defaultCompetitionConfig.events.find((candidate) => candidate.id === "nr-air-rifle")!
        const nrCategories = getCompetitionCategories(nrEvent)
        expect(nrCategories.map((category) => category.code)).toEqual(expect.arrayContaining(["R-19", "R-20", "R-21", "R-22"]))
        expect(nrCategories.filter((category) => category.bracket.startsWith("little"))).toHaveLength(4)

        const customCategories = getCompetitionCategories({
            ...nrEvent,
            categories: [{ code: "LC-OPEN", label: "Little Champ Open", bracket: "little-standing", gender: "open" }],
        })
        expect(customCategories).toEqual([
            { code: "LC-OPEN", label: "Little Champ Open", bracket: "little-standing", gender: "open" },
        ])
    })

    it("resolves event-wide, selected-category, and disabled cash prizes", () => {
        const event = {
            ...defaultCompetitionConfig.events[1],
            categoryPrizes: { "S-19": [9000, 6000, 3000] as [number, number, number] },
        }

        expect(getCategoryCashPrizes(event, "S-20", { cashPrizeMode: "event-wide" })).toEqual(event.prizes)
        expect(getCategoryCashPrizes(event, "S-19", { cashPrizeMode: "category-specific" })).toEqual([9000, 6000, 3000])
        expect(getCategoryCashPrizes(event, "S-20", { cashPrizeMode: "category-specific" })).toBeNull()
        expect(getCategoryCashPrizes(event, "S-19", { cashPrizeMode: "none" })).toBeNull()
    })
})
