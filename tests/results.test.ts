import { describe, expect, it } from "vitest"
import { isTopResultCategory } from "@/lib/results"

describe("top result category eligibility", () => {
    it("excludes Little Champ category codes from combined leaderboards", () => {
        expect(isTopResultCategory({ categoryCode: "S-19" }, "S", 11, 24)).toBe(false)
        expect(isTopResultCategory({ categoryCode: "R-22" }, "R", 11, 24)).toBe(false)
    })

    it("excludes categories identified as Little Champ by their label", () => {
        expect(isTopResultCategory({
            categoryCode: "S-18",
            categoryLabel: "NR Air Pistol Standing Little Champ Boys",
        }, "S", 11, 24)).toBe(false)
    })

    it("keeps non-Little-Champ categories inside the configured range", () => {
        expect(isTopResultCategory({ categoryCode: "S-18", categoryLabel: "NR Air Pistol Sub Youth Women" }, "S", 11, 24)).toBe(true)
        expect(isTopResultCategory({ categoryCode: "R-23", categoryLabel: "NR Air Rifle Master Men" }, "R", 11, 24)).toBe(true)
    })
})
