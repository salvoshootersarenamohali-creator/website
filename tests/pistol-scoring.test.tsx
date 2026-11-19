import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ScoreSeries } from "@/components/ScoreSeries"
import { getScoringFormat, getScoringSeriesCount, isValidSeriesTotal } from "@/lib/competition"
import { formatResultTotal, formatScore, getStageTotals, isEntryScored, rankRows, type ResultEntryLike } from "@/lib/results"
import { buildParticipantDirectory } from "@/lib/participants"

const formats = [
    ["nr-25m-sports-pistol", "NR", 6, 50, 300],
    ["issf-25m-sports-pistol", "ISSF", 12, 50, 600],
    ["nr-25m-center-fire", "NR", 6, 50, 300],
    ["issf-25m-center-fire", "ISSF", 12, 50, 600],
    ["nr-25m-standard-pistol", "NR", 6, 50, 300],
    ["issf-25m-standard-pistol", "ISSF", 12, 50, 600],
    ["nr-50m-free-pistol", "NR", 3, 100, 300],
    ["issf-50m-free-pistol", "ISSF", 6, 100, 600],
] as const

function entry(eventId: string, ruleSet: string, scores: number[]): ResultEntryLike {
    return { eventId, ruleSet, categoryCode: "B-01", seriesScores: scores, totalScore: scores.reduce((a, b) => a + b, 0), innerTenCount: 99 }
}

describe.each(formats)("%s scoring", (eventId, ruleSet, count, maximum, total) => {
    const format = getScoringFormat(ruleSet, { eventId })
    it("uses the agreed count, score limits, and whole-number format", () => {
        expect(getScoringSeriesCount(ruleSet, { eventId })).toBe(count)
        expect(format).toMatchObject({ seriesCount: count, maxSeriesScore: maximum, maxTotalScore: total, decimalPlaces: 0, usesInnerTens: false })
        expect(formatScore(maximum, ruleSet, { eventId })).toBe(String(maximum))
        for (const value of [0, maximum, "0", String(maximum)]) expect(isValidSeriesTotal(value, format)).toBe(true)
        for (const value of ["", " ", null, undefined, true, {}, -1, maximum + 1, 1.5, "45.0", "1e1", Infinity, NaN]) expect(isValidSeriesTotal(value, format)).toBe(false)
    })

    it("accepts complete zero/maximum scores and rejects incompatible saved scores", () => {
        for (const score of [0, maximum]) {
            const saved = entry(eventId, ruleSet, Array(count).fill(score))
            expect(isEntryScored(saved)).toBe(true)
            expect(formatResultTotal(saved)).toBe(`${score * count} / ${total}`)
        }
        const saved = entry(eventId, ruleSet, Array(count).fill(maximum))
        for (const seriesScores of [Array(count - 1).fill(0), Array(count + 1).fill(0), [...Array(count - 1).fill(0), null], [...Array(count - 1).fill(0), maximum + 1], Array(count).fill(1.5), Array(count).fill("45")]) {
            expect(isEntryScored({ ...saved, seriesScores })).toBe(false)
        }
        expect(isEntryScored({ ...saved, totalScore: total - 1 })).toBe(false)
        expect(isEntryScored({ ...saved, totalScore: null })).toBe(false)
    })

    it("renders every series and derives the correct stage subtotals", () => {
        const saved = entry(eventId, ruleSet, Array(count).fill(maximum - 1))
        const stages = getStageTotals(saved)
        if (maximum === 50) {
            expect(stages.map(({ total, maxScore }) => [total, maxScore])).toEqual(format.stages.map((stage) => [stage.seriesCount * 49, stage.maxScore]))
            const partial = getStageTotals({ ...saved, seriesScores: Array(stages[0].seriesCount).fill(49) })
            expect(partial[0].total).toBe(stages[0].seriesCount * 49)
            expect(partial.slice(1).every((stage) => stage.total === null)).toBe(true)
        } else expect(stages).toEqual([])
        const html = renderToStaticMarkup(createElement(ScoreSeries, { entry: saved }))
        expect(html.match(/S\d:/g)).toHaveLength(count)
        expect(html).not.toContain("10x")
        if (maximum === 50) {
            for (const stage of stages) expect(html).toContain(`${stage.label}:`)
        }
    })

    it("ranks by total then reverse series, ignoring legacy inner tens", () => {
        const scores = Array(count).fill(maximum - 1)
        const a = entry(eventId, ruleSet, scores)
        const b = { ...a, innerTenCount: 0, seriesScores: [...scores.slice(0, -2), maximum - 2, maximum] }
        const tied = { ...b, innerTenCount: 30 }
        const rows = rankRows([
            { registration: { name: "A" }, entry: a },
            { registration: { name: "B" }, entry: b },
            { registration: { name: "C" }, entry: tied },
            { registration: { name: "Pending" }, entry: { ...a, seriesScores: [] } },
        ])
        expect(rows.map(({ registration, rank }) => [registration.name, rank])).toEqual([["B", 1], ["C", 1], ["A", 3], ["Pending", null]])
    })
})

it("retains other Air Pistol and Air Rifle formats", () => {
    expect(getScoringFormat("ISSF", { eventId: "issf-air-pistol" })).toMatchObject({ seriesCount: 6, maxSeriesScore: 109, decimalPlaces: 1, usesInnerTens: true })
    expect(getScoringFormat("NR", { eventId: "nr-air-rifle" })).toMatchObject({ seriesCount: 4, maxSeriesScore: 100, usesInnerTens: true })
    expect(getScoringFormat("NR", { categoryCode: "S-19" }).seriesCount).toBe(2)
    const a = entry("nr-air-pistol", "NR", [90, 90, 90, 90])
    const ranked = rankRows([{ registration: { name: "Low" }, entry: { ...a, innerTenCount: 0 } }, { registration: { name: "High" }, entry: { ...a, innerTenCount: 20 } }])
    expect(ranked[0].registration.name).toBe("High")
})

it.each([
    ["NR", "nr-25m-standard-pistol", 2, 100, [99, 95, 91]],
    ["ISSF", "issf-25m-standard-pistol", 4, 200, [194, 178, 162]],
] as const)("groups %s Standard Pistol in 150 sec, 20 sec, and 10 sec order", (ruleSet, eventId, seriesPerStage, stageMaximum, stageTotals) => {
    const format = getScoringFormat(ruleSet, { eventId })
    expect(format.seriesCount * format.shotsPerSeries).toBe(ruleSet === "NR" ? 30 : 60)
    expect(format.stages).toEqual(["150 sec", "20 sec", "10 sec"].map((label, index) => ({ label, startIndex: index * seriesPerStage, seriesCount: seriesPerStage, maxScore: stageMaximum })))
    const scores = Array.from({ length: format.seriesCount }, (_, index) => 50 - index)
    expect(getStageTotals(entry(eventId, ruleSet, scores)).map((stage) => stage.total)).toEqual(stageTotals)
    const oldSeries = Array(ruleSet === "NR" ? 4 : 6).fill(95)
    expect(isEntryScored(entry(eventId, ruleSet, oldSeries))).toBe(false)
})

it("uses the new completeness and ranking rules for participant certificates and para entries", () => {
    const scores = entry("nr-50m-free-pistol", "NR", [95, 96, 97])
    const registrations = [false, true].map((isPara) => ({
        id: isPara ? "para" : "regular", name: isPara ? "Para Shooter" : "Regular Shooter", academy: "Test Academy",
        entries: [{ ...scores, id: isPara ? "p" : "r", eventId: "nr-50m-free-pistol", eventTitle: "50m Free Pistol (NR)", categoryLabel: "Senior Men", isPara }],
    }))
    const directory = buildParticipantDirectory(registrations, "super-cup-2026")
    expect(directory.uniqueParticipantCount).toBe(2)
    expect(directory.regularCategories[0].participants[0].categoryEntry.rank).toBe(1)
    expect(directory.paraCategories[0].participants[0].categoryEntry.rank).toBe(1)
    expect(buildParticipantDirectory([{ ...registrations[0], entries: [{ ...registrations[0].entries[0], seriesScores: [95, 96, 97, 98] }] }], "super-cup-2026").uniqueParticipantCount).toBe(0)
})
