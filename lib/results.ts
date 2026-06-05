import { getScoringSeriesCount } from "@/lib/competition"

export type ResultEntryLike = {
    categoryCode: string
    ruleSet: string
    seriesScores: unknown
    innerTenCount: number
    totalScore: number | null
}

export type ResultRegistrationLike = {
    name: string
}

export type RankedResultRow<TRegistration extends ResultRegistrationLike, TEntry extends ResultEntryLike> = {
    registration: TRegistration
    entry: TEntry
    rank: number | null
}

export function categorySortValue(code: string) {
    const match = code.match(/^([A-Za-z]+)-(\d+)$/)
    return match ? `${match[1]}-${match[2].padStart(4, "0")}` : code
}

export function getRuleSet(entry: Pick<ResultEntryLike, "ruleSet">) {
    return entry.ruleSet === "ISSF" ? "ISSF" : "NR"
}

export function getSeriesScores(entry: Pick<ResultEntryLike, "seriesScores">) {
    return Array.isArray(entry.seriesScores) ? entry.seriesScores.filter((score): score is number => typeof score === "number") : []
}

export function isEntryScored(entry: ResultEntryLike) {
    return getSeriesScores(entry).length === getScoringSeriesCount(getRuleSet(entry), entry)
}

export function formatScore(score: number | null | undefined, ruleSet: "NR" | "ISSF" = "ISSF") {
    if (typeof score !== "number") return "-"
    return ruleSet === "NR" ? score.toFixed(0) : score.toFixed(1)
}

export function rankRows<TRegistration extends ResultRegistrationLike, TEntry extends ResultEntryLike>(
    rows: { registration: TRegistration; entry: TEntry }[]
): RankedResultRow<TRegistration, TEntry>[] {
    const compareSeriesScores = (a: TEntry, b: TEntry) => {
        const aScores = getSeriesScores(a)
        const bScores = getSeriesScores(b)
        const count = Math.max(aScores.length, bScores.length)
        for (let index = count - 1; index >= 0; index -= 1) {
            const diff = (bScores[index] ?? 0) - (aScores[index] ?? 0)
            if (diff !== 0) return diff
        }
        return 0
    }
    const hasSameSeriesScores = (a: TEntry, b: TEntry) => compareSeriesScores(a, b) === 0

    const sorted = [...rows].sort((a, b) => {
        const aScored = isEntryScored(a.entry)
        const bScored = isEntryScored(b.entry)
        if (aScored !== bScored) return aScored ? -1 : 1
        if (!aScored || !bScored) return a.registration.name.localeCompare(b.registration.name)
        if (a.entry.totalScore !== b.entry.totalScore) return (b.entry.totalScore ?? 0) - (a.entry.totalScore ?? 0)
        if (a.entry.innerTenCount !== b.entry.innerTenCount) return b.entry.innerTenCount - a.entry.innerTenCount
        const seriesScoreDiff = compareSeriesScores(a.entry, b.entry)
        if (seriesScoreDiff !== 0) return seriesScoreDiff
        return a.registration.name.localeCompare(b.registration.name)
    })

    let previous: { registration: TRegistration; entry: TEntry } | null = null
    let previousRank = 0
    return sorted.map((row, index) => {
        if (!isEntryScored(row.entry)) return { ...row, rank: null }
        const sameTie = previous
            && isEntryScored(previous.entry)
            && previous.entry.totalScore === row.entry.totalScore
            && previous.entry.innerTenCount === row.entry.innerTenCount
            && hasSameSeriesScores(previous.entry, row.entry)
        const rank = sameTie ? previousRank : index + 1
        previous = row
        previousRank = rank
        return { ...row, rank }
    })
}
