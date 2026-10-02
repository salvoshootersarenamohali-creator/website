import { describe, expect, it } from "vitest"
import {
    buildCompetitionSlotsForDateRange,
    defaultCompetitionConfig,
    formatCompetitionDateLabel,
    getCompetitionCategories,
    getEntryFee,
    getRegistrationEntryFee,
    getScoringSeriesCount,
    normalizeCompetitionConfig,
    parseCompetitionDate,
    validateCashPrizeConfiguration,
    validateParaEntryConfiguration,
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

    it("converts valid legacy category prizes into custom groups", () => {
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
        expect(config.cashPrizeMode).toBe("custom-groups")
        expect(config.cashPrizeGroups).toEqual([{
            id: "legacy-nr-air-pistol-s-19",
            title: "NR Air Pistol Standing Little Champ Boys",
            tag: "NR",
            prizes: [5000, 3000, 1000],
            target: { type: "categories", eventId: "nr-air-pistol", categoryCodes: ["S-19"] },
        }])
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

    it("normalizes the complete Bharat Cup prize schedule in display order", () => {
        const groups = [
            { id: "issf-pistol", title: "10M Air Pistol", tag: "ISSF", prizes: [21000, 11000, 7100], target: { type: "event", eventId: "issf-air-pistol" } },
            { id: "issf-rifle", title: "10M Air Rifle Peep Sight", tag: "ISSF", prizes: [11000, 7100, 5100], target: { type: "event", eventId: "issf-air-rifle" } },
            { id: "nr-pistol", title: "10M Air Pistol", tag: "NR", prizes: [11000, 7100, 5100], target: { type: "event", eventId: "nr-air-pistol" } },
            { id: "nr-rifle", title: "10M Air Rifle Peep Sight", tag: "NR", prizes: [7100, 5100, 3100], target: { type: "event", eventId: "nr-air-rifle" } },
            { id: "standing-pistol", title: "Little Champ Standing Pistol", tag: null, prizes: [2100, 1500, 1100], target: { type: "categories", eventId: "nr-air-pistol", categoryCodes: ["S-19", "S-20"] } },
            { id: "standing-rifle", title: "Little Champ Standing Rifle", tag: null, prizes: [2100, 1500, 1100], target: { type: "categories", eventId: "nr-air-rifle", categoryCodes: ["R-19", "R-20"] } },
            { id: "sitting-pistol", title: "Little Champ Sitting - Pistol", tag: null, prizes: [2100, 1500, 1100], target: { type: "categories", eventId: "nr-air-pistol", categoryCodes: ["S-21", "S-22"] } },
            { id: "mixed-team", title: "Mixed Team", tag: "TEAM", prizes: [5100, 3100, 2100], target: { type: "team" } },
        ]
        const rawConfig = {
            ...defaultCompetitionConfig,
            cashPrizeMode: "custom-groups",
            cashPrizeTitle: "Champion of Champions - Cash Prize Structure",
            cashPrizeNote: "Minimum 30 entries are required. Every cash prize includes a Medal and Trophy.",
            cashPrizeGroups: groups,
        }
        const config = normalizeCompetitionConfig(rawConfig)

        expect(validateCashPrizeConfiguration(rawConfig)).toBeNull()
        expect(config.cashPrizeGroups).toHaveLength(8)
        expect(config.cashPrizeGroups.map((group) => group.id)).toEqual(groups.map((group) => group.id))
        expect(config.cashPrizeGroups[4].target).toEqual({ type: "categories", eventId: "nr-air-pistol", categoryCodes: ["S-19", "S-20"] })
        expect(config.cashPrizeGroups[7]).toMatchObject({ title: "Mixed Team", prizes: [5100, 3100, 2100], target: { type: "team" } })
    })

    it("supports general groups and rejects malformed custom schedules", () => {
        const generalConfig = {
            ...defaultCompetitionConfig,
            cashPrizeMode: "custom-groups",
            cashPrizeTitle: "Special Awards",
            cashPrizeGroups: [{ id: "special", title: "Special Award", tag: null, prizes: [1000, 500, 250], target: { type: "general" } }],
        }
        expect(validateCashPrizeConfiguration(generalConfig)).toBeNull()
        expect(normalizeCompetitionConfig(generalConfig).cashPrizeGroups[0].target).toEqual({ type: "general" })

        expect(validateCashPrizeConfiguration({ ...generalConfig, cashPrizeGroups: [] })).toBe("Add at least one cash prize group.")
        expect(validateCashPrizeConfiguration({
            ...generalConfig,
            cashPrizeGroups: [
                generalConfig.cashPrizeGroups[0],
                { ...generalConfig.cashPrizeGroups[0] },
            ],
        })).toBe("Every cash prize group must have a unique ID.")
        expect(validateCashPrizeConfiguration({
            ...generalConfig,
            cashPrizeGroups: [{ ...generalConfig.cashPrizeGroups[0], prizes: [1000, -1, 250] }],
        })).toBe("Every cash prize group must have three non-negative whole-number amounts.")
        expect(validateCashPrizeConfiguration({
            ...generalConfig,
            cashPrizeGroups: [{ ...generalConfig.cashPrizeGroups[0], target: { type: "event", eventId: "missing" } }],
        })).toBe("Every cash prize group must have a valid display association.")
    })
})

describe("competition para entry policy", () => {
    it("defaults legacy configurations to a custom para fee matching the base entry fee", () => {
        const config = normalizeCompetitionConfig({ entryFee: 1250 })

        expect(config.paraEntryMode).toBe("custom-fee")
        expect(config.paraEntryFee).toBe(1250)
    })

    it("normalizes valid para settings and safely falls back from malformed values", () => {
        expect(normalizeCompetitionConfig({ paraEntryMode: "sponsored", paraEntryFee: 650 })).toMatchObject({
            paraEntryMode: "sponsored",
            paraEntryFee: 650,
        })
        expect(normalizeCompetitionConfig({ entryFee: 1100, paraEntryMode: "invalid", paraEntryFee: -1 })).toMatchObject({
            paraEntryMode: "custom-fee",
            paraEntryFee: 1100,
        })
    })

    it("rejects unknown modes and malformed custom fees", () => {
        expect(validateParaEntryConfiguration({ paraEntryMode: "invalid", paraEntryFee: 500 })).toBe("Para entry policy must use a custom fee or sponsorship.")
        expect(validateParaEntryConfiguration({ paraEntryMode: "custom-fee", paraEntryFee: -1 })).toBe("Para entry fee must be a non-negative whole number.")
        expect(validateParaEntryConfiguration({ paraEntryMode: "custom-fee", paraEntryFee: 10.5 })).toBe("Para entry fee must be a non-negative whole number.")
        expect(validateParaEntryConfiguration({ paraEntryMode: "custom-fee", paraEntryFee: "500" })).toBe("Para entry fee must be a non-negative whole number.")
        expect(validateParaEntryConfiguration({ paraEntryMode: "custom-fee", paraEntryFee: "free" })).toBe("Para entry fee must be a non-negative whole number.")
        expect(validateParaEntryConfiguration({ paraEntryMode: "sponsored", paraEntryFee: "inactive" })).toBeNull()
    })

    it("uses custom or sponsored pricing only after an entry is marked para", () => {
        const category = { bracket: "senior" as const, ruleSet: "NR" as const }
        const paidConfig = normalizeCompetitionConfig({
            entryFee: 1000,
            feesByRuleSet: { NR: 800, ISSF: 1000 },
            paraEntryMode: "custom-fee",
            paraEntryFee: 450,
        })
        const sponsoredConfig = normalizeCompetitionConfig({ ...paidConfig, paraEntryMode: "sponsored" })

        expect(getEntryFee(category, paidConfig)).toBe(800)
        expect(getEntryFee(category, paidConfig, true)).toBe(450)
        expect(getEntryFee(category, sponsoredConfig, true)).toBe(0)
    })

    it("restores the current configured fee for stored custom and Little Champ entries", () => {
        const nrEvent = defaultCompetitionConfig.events.find((event) => event.id === "nr-air-rifle")!
        const config = normalizeCompetitionConfig({
            ...defaultCompetitionConfig,
            littleChampEntryFee: 700,
            events: [{
                ...nrEvent,
                categories: [{ code: "CUSTOM-LC", label: "Junior Supported", bracket: "little-standing", gender: "open" }],
            }],
        })

        expect(getRegistrationEntryFee({ eventId: nrEvent.id, categoryCode: "CUSTOM-LC", categoryLabel: "Junior Supported", ruleSet: "NR" }, config)).toBe(700)
        expect(getRegistrationEntryFee({ eventId: "missing", categoryCode: "R-21", categoryLabel: "Stored entry", ruleSet: "NR" }, config)).toBe(700)
    })
})
