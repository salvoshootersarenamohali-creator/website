import { describe, expect, it } from "vitest"
import { getBharatCupFinals } from "@/lib/bharat-cup-finals"
import { competitionEvents } from "@/lib/competition"

type Entry = Parameters<typeof getBharatCupFinals>[0][number]

function score(id: string, overrides: Partial<Entry> & { innerTenCount?: number } = {}): Entry {
    return {
        id, eventId: "nr-air-pistol", categoryCode: "S-11", isPara: false,
        seriesScores: [90, 91, 92, 93], totalScore: 366,
        registration: { name: id, academy: "Academy", gender: "" },
        ...overrides,
    }
}

describe("Bharat Cup finals qualification", () => {
    it("uses total, last series and second-last series in that order, ignoring 10x", () => {
        const [pistol] = getBharatCupFinals([
            score("High 10x", { totalScore: 380, seriesScores: [98, 93, 93, 96], innerTenCount: 36 }),
            score("Second-last series leader", { totalScore: 380, seriesScores: [92, 93, 99, 96], innerTenCount: 0 }),
            score("Last series leader", { totalScore: 380, seriesScores: [94, 94, 94, 98], innerTenCount: 0 }),
            score("Total leader", { totalScore: 382, seriesScores: [95, 96, 96, 95], innerTenCount: 0 }),
        ], competitionEvents)
        expect(pistol.boys.qualifiers.map(({ name }) => name)).toEqual([
            "Total leader", "Last series leader", "Second-last series leader", "High 10x",
        ])
    })

    it("selects six boys and four girls per event and recalculates when a better score is posted", () => {
        const entries = ["nr-air-pistol", "issf-air-pistol", "nr-air-rifle", "issf-air-rifle"].flatMap((eventId) => {
            const prefix = eventId.endsWith("pistol") ? "S" : "R"
            const issf = eventId.startsWith("issf")
            const series = Array.from({ length: issf ? 5 : 3 }, () => 90)
            return (["boys", "girls"] as const).flatMap((group) => {
                const code = issf ? (group === "boys" ? "01" : "02") : (group === "boys" ? "11" : "12")
                return Array.from({ length: 8 }, (_, i) => score(`${eventId}-${group}-${i}`, {
                    eventId, categoryCode: `${prefix}-${code}`, seriesScores: [...series, 90 + i],
                    totalScore: 90 * (series.length + 1) + i,
                }))
            })
        })
        const finals = getBharatCupFinals(entries, competitionEvents)
        expect(finals.map(({ id }) => id)).toEqual(["nr-air-pistol", "issf-air-pistol", "nr-air-rifle", "issf-air-rifle"])
        for (const { id, boys, girls } of finals) {
            expect(boys.qualifiers.map((entry) => entry.id)).toEqual([7, 6, 5, 4, 3, 2].map((i) => `${id}-boys-${i}`))
            expect(girls.qualifiers.map((entry) => entry.id)).toEqual([7, 6, 5, 4].map((i) => `${id}-girls-${i}`))
        }
        const newest = score("New score", { categoryCode: "S-12", seriesScores: [93, 93, 93, 93], totalScore: 372 })
        const [nrPistol] = getBharatCupFinals([...entries, newest], competitionEvents)
        expect(nrPistol.girls.qualifiers.map(({ id }) => id)).toEqual([
            "New score", "nr-air-pistol-girls-7", "nr-air-pistol-girls-6", "nr-air-pistol-girls-5",
        ])
    })

    it("excludes incomplete and separate matches and uses a shooter's best eligible result only once", () => {
        const [pistol, , , rifle] = getBharatCupFinals([
            score("best", { registration: { name: "Some Shooter", academy: "Academy", gender: "" } }),
            score("repeat", {
                categoryCode: "S-13", totalScore: 365, seriesScores: [90, 90, 92, 93],
                registration: { name: " some  shooter ", academy: "academy", gender: "male" },
            }),
            score("Little Champ", { categoryCode: "S-19", totalScore: 400, seriesScores: [100, 100, 100, 100] }),
            score("Mixed", { categoryCode: "S-11 (Mix)", totalScore: 400, seriesScores: [100, 100, 100, 100] }),
            score("Para", { isPara: true, totalScore: 400, seriesScores: [100, 100, 100, 100] }),
            score("Short score", { totalScore: 200, seriesScores: [100, 100] }),
            score("Missing total", { totalScore: null }),
            score("Under review", {
                eventId: "issf-air-rifle", categoryCode: "R-03", totalScore: 624.3,
                seriesScores: [102.7, null, 104.9, 104.8, 103.9, 104],
            }),
        ], competitionEvents)
        expect(pistol.boys.qualifiers.map(({ id }) => id)).toEqual(["best"])
        expect(rifle.boys.qualifiers).toEqual([])
    })

    it("flags a tie across the cutoff even when earlier series and 10x are different", () => {
        const [pistol] = getBharatCupFinals([
            ...[100, 99, 98].map((last) => score(`Leader ${last}`, {
                categoryCode: "S-12", totalScore: 300 + last, seriesScores: [100, 100, 100, last],
            })),
            score("Tied A", { categoryCode: "S-12", totalScore: 390, seriesScores: [98, 96, 98, 98], innerTenCount: 0 }),
            score("Tied B", { categoryCode: "S-12", totalScore: 390, seriesScores: [96, 98, 98, 98], innerTenCount: 39 }),
        ], competitionEvents)
        expect(pistol.girls.qualifiers).toHaveLength(3)
        expect(pistol.girls.cutoffTie.map(({ name, rank }) => [name, rank])).toEqual([["Tied A", 4], ["Tied B", 4]])
    })
})
