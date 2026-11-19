import { getScoringFormat, isLittleChampCategory, isValidSeriesTotal, type ScoringCategory } from "@/lib/competition"

export type ResultEntryLike = {
    eventId?: string | null
    categoryCode: string
    categoryLabel?: string | null
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

export function isTopResultCategory(
    category: Pick<ResultEntryLike, "categoryCode"> & { categoryLabel?: string | null },
    prefix: "S" | "R",
    min: number,
    max: number
) {
    const match = category.categoryCode.trim().toUpperCase().match(/^([SR])-(\d+)$/)
    if (!match || match[1] !== prefix || isLittleChampCategory(category)) return false

    const number = Number(match[2])
    return Number.isInteger(number) && number >= min && number <= max
}

export function getRuleSet(entry: Pick<ResultEntryLike, "ruleSet">) {
    return entry.ruleSet === "ISSF" ? "ISSF" : "NR"
}

export function getSeriesScores(entry: Pick<ResultEntryLike, "seriesScores">) {
    return Array.isArray(entry.seriesScores) ? entry.seriesScores.filter((score): score is number => typeof score === "number") : []
}

export function isEntryScored(entry: ResultEntryLike) {
    const format = getScoringFormat(getRuleSet(entry), entry)
    if (!format.isCustomFormat) return getSeriesScores(entry).length === format.seriesCount
    const scores = entry.seriesScores
    return Array.isArray(scores) && scores.length === format.seriesCount
        && scores.every((score) => typeof score === "number" && isValidSeriesTotal(score, format))
        && (!format.usesInnerTens || (Number.isInteger(entry.innerTenCount) && entry.innerTenCount >= 0 && entry.innerTenCount <= format.seriesCount * format.shotsPerSeries))
        && typeof entry.totalScore === "number" && Number.isFinite(entry.totalScore)
        && entry.totalScore === scores.reduce((sum, score: number) => sum + score, 0)
}

export function formatScore(score: number | null | undefined, ruleSet: "NR" | "ISSF" = "ISSF", category: ScoringCategory = {}) {
    if (typeof score !== "number") return "-"
    return score.toFixed(getScoringFormat(ruleSet, category).decimalPlaces)
}

export function formatResultTotal(entry: ResultEntryLike) {
    if (!isEntryScored(entry)) return "-"
    const format = getScoringFormat(getRuleSet(entry), entry)
    return formatScore(entry.totalScore, getRuleSet(entry), entry) + (format.isCustomFormat ? ` / ${format.maxTotalScore}` : "")
}

export function getStageTotals(entry: Pick<ResultEntryLike, "ruleSet" | "eventId" | "seriesScores">) {
    const format = getScoringFormat(getRuleSet(entry), entry)
    const scores = Array.isArray(entry.seriesScores) ? entry.seriesScores : []
    return format.stages.map((stage) => {
        const stageScores = scores.slice(stage.startIndex, stage.startIndex + stage.seriesCount)
        const complete = stageScores.length === stage.seriesCount
            && stageScores.every((score) => typeof score === "number" && isValidSeriesTotal(score, format))
        return { ...stage, total: complete ? stageScores.reduce((sum: number, score: number) => sum + score, 0) : null }
    })
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
    const innerTens = (entry: TEntry) => getScoringFormat(getRuleSet(entry), entry).usesInnerTens ? entry.innerTenCount : 0

    const sorted = [...rows].sort((a, b) => {
        const aScored = isEntryScored(a.entry)
        const bScored = isEntryScored(b.entry)
        if (aScored !== bScored) return aScored ? -1 : 1
        if (!aScored || !bScored) return a.registration.name.localeCompare(b.registration.name)
        if (a.entry.totalScore !== b.entry.totalScore) return (b.entry.totalScore ?? 0) - (a.entry.totalScore ?? 0)
        if (innerTens(a.entry) !== innerTens(b.entry)) return innerTens(b.entry) - innerTens(a.entry)
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
            && innerTens(previous.entry) === innerTens(row.entry)
            && hasSameSeriesScores(previous.entry, row.entry)
        const rank = sameTie ? previousRank : index + 1
        previous = row
        previousRank = rank
        return { ...row, rank }
    })
}
