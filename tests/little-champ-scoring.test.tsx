import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ScoreSeries } from "@/components/ScoreSeries"
import { getScoringFormat, getScoringSeriesCount, isValidSeriesTotal } from "@/lib/competition"
import { formatResultTotal, isEntryScored, rankRows, type ResultEntryLike } from "@/lib/results"
import { categoryScoreColumns, registrationScoreColumns } from "@/lib/score-export"

function entry(overrides: Partial<ResultEntryLike> = {}): ResultEntryLike {
    return { eventId: "nr-air-pistol", ruleSet: "NR", categoryCode: "S-19", seriesScores: [95, 96], totalScore: 191, innerTenCount: 10, ...overrides }
}

describe.each(["S", "R"])("Little Champ %s categories", (prefix) => {
    it.each([19, 20, 21, 22, 25, 26, 27, 28])("uses two series out of 100 for category %i", (number) => {
        const category = { categoryCode: `${prefix}-${number}` }
        expect(getScoringSeriesCount("NR", category)).toBe(2)
        expect(getScoringFormat("NR", category)).toMatchObject({ isCustomFormat: true, seriesCount: 2, shotsPerSeries: 10, maxSeriesScore: 100, maxTotalScore: 200, decimalPlaces: 0, usesInnerTens: true, stages: [] })
    })
})

it("recognizes standing, sitting, and custom categories identified by their label", () => {
    for (const category of [{ bracket: "little-standing" }, { bracket: "little-sitting" }, { categoryCode: "CUSTOM", categoryLabel: "NR Air Pistol Little Champ Boys" }]) {
        expect(getScoringFormat("NR", category)).toMatchObject({ seriesCount: 2, maxTotalScore: 200 })
    }
    const custom = entry({ categoryCode: "CUSTOM", categoryLabel: "NR Air Pistol Little Champ Boys" })
    expect(isEntryScored(custom)).toBe(true)
    expect(formatResultTotal(custom)).toBe("191 / 200")
})

it("accepts whole-number series from zero through 100 and rejects incompatible saved totals", () => {
    const format = getScoringFormat("NR", entry())
    for (const score of [0, 100, "0", "100"]) expect(isValidSeriesTotal(score, format)).toBe(true)
    for (const score of [101, -1, 99.5, "", null]) expect(isValidSeriesTotal(score, format)).toBe(false)
    expect(formatResultTotal(entry({ seriesScores: [100, 100], totalScore: 200 }))).toBe("200 / 200")
    expect(formatResultTotal(entry({ seriesScores: [0, 0], totalScore: 0 }))).toBe("0 / 200")
    for (const invalid of [{ seriesScores: [95] }, { seriesScores: [95, 96, 97, 98], totalScore: 386 }, { seriesScores: [100, 101], totalScore: 201 }, { totalScore: 192 }, { innerTenCount: 21 }, { innerTenCount: -1 }]) {
        expect(isEntryScored(entry(invalid))).toBe(false)
        expect(formatResultTotal(entry(invalid))).toBe("-")
    }
})

it("keeps inner-ten tie-breaking and then compares the last of the two series", () => {
    const rows = rankRows([
        { registration: { name: "Countback" }, entry: entry({ seriesScores: [90, 95], totalScore: 185, innerTenCount: 5 }) },
        { registration: { name: "Inner tens" }, entry: entry({ seriesScores: [95, 90], totalScore: 185, innerTenCount: 10 }) },
        { registration: { name: "Earlier series" }, entry: entry({ seriesScores: [95, 90], totalScore: 185, innerTenCount: 5 }) },
    ])
    expect(rows.map(({ registration, rank }) => [registration.name, rank])).toEqual([["Inner tens", 1], ["Countback", 2], ["Earlier series", 3]])
})

it("renders and exports two series, a total out of 200, and the existing 10x count", () => {
    const scored = entry()
    const html = renderToStaticMarkup(createElement(ScoreSeries, { entry: scored }))
    expect(html.match(/S\d:/g)).toHaveLength(2)
    expect(html).toContain("95 / 100")
    expect(categoryScoreColumns(scored)).toEqual({ "Series 1 /100": "95", "Series 2 /100": "96", "Total 10x": 10, "Total Score /200": "191", Status: "Scored" })
    expect(registrationScoreColumns(scored, 6, [])).toMatchObject({ "Series 1": "95", "Series 2": "96", "Series 3": "", Total: "191", "10x": 10 })
})
