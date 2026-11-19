import { getScoringFormat } from "@/lib/competition"
import { formatScore, getRuleSet, getSeriesScores, getStageTotals, isEntryScored, type ResultEntryLike } from "@/lib/results"

export function categoryScoreColumns(entry: ResultEntryLike) {
    const ruleSet = getRuleSet(entry)
    const format = getScoringFormat(ruleSet, entry)
    const scored = isEntryScored(entry)
    const scores = getSeriesScores(entry)
    const columns: Record<string, string | number> = {}
    const stages = getStageTotals(entry)
    if (stages.length) {
        for (const stage of stages) {
            for (let index = 0; index < stage.seriesCount; index++) {
                columns[`${stage.label} ${index + 1} /${format.maxSeriesScore}`] = scored ? scores[stage.startIndex + index] : ""
            }
            columns[`${stage.label} Total /${stage.maxScore}`] = scored ? stage.total ?? "" : ""
        }
    } else {
        const seriesCount = format.isEventSpecific ? format.seriesCount : 6
        for (let index = 0; index < seriesCount; index++) {
            columns[`Series ${index + 1}${format.isEventSpecific ? ` /${format.maxSeriesScore}` : ""}`] = scored && scores[index] !== undefined ? formatScore(scores[index], ruleSet, entry) : ""
        }
    }
    if (format.usesInnerTens) columns["Total 10x"] = scored ? entry.innerTenCount : ""
    columns[`Total Score${format.isEventSpecific ? ` /${format.maxTotalScore}` : ""}`] = scored ? formatScore(entry.totalScore, ruleSet, entry) : ""
    columns.Status = scored ? "Scored" : "Pending"
    return columns
}

export function registrationScoreColumns(entry: ResultEntryLike, seriesCount: number, includeStages: boolean) {
    const ruleSet = getRuleSet(entry)
    const format = getScoringFormat(ruleSet, entry)
    const scores = getSeriesScores(entry)
    const compatible = !format.isEventSpecific || isEntryScored(entry)
    const columns: Record<string, string | number> = {}
    for (let index = 0; index < seriesCount; index++) {
        columns[`Series ${index + 1}`] = compatible && scores[index] !== undefined ? formatScore(scores[index], ruleSet, entry) : ""
    }
    if (includeStages) {
        for (const label of ["Precision", "Duelling"]) {
            const stage = getStageTotals(entry).find((stage) => stage.label === label)
            columns[`${label} Total`] = compatible ? stage?.total ?? "" : ""
            columns[`${label} Maximum`] = stage?.maxScore ?? ""
        }
    }
    columns.Total = compatible && typeof entry.totalScore === "number" ? formatScore(entry.totalScore, ruleSet, entry) : ""
    columns["10x"] = format.usesInnerTens ? entry.innerTenCount : ""
    return columns
}
