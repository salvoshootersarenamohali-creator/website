import { describe, expect, it } from "vitest"
import { getScoringSeriesCount } from "@/lib/competition"

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
