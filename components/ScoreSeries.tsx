import { getScoringFormat } from "@/lib/competition"
import { formatScore, getRuleSet, getSeriesScores, getStageTotals, isEntryScored, type ResultEntryLike } from "@/lib/results"

export function ScoreSeries({ entry }: { entry: ResultEntryLike }) {
    if (!isEntryScored(entry)) return <p className="text-sm text-white/40">Score pending</p>
    const ruleSet = getRuleSet(entry)
    const format = getScoringFormat(ruleSet, entry)
    const scores = getSeriesScores(entry)
    const stages = getStageTotals(entry)
    const groups = stages.length ? stages : [{ label: "", startIndex: 0, seriesCount: format.seriesCount, maxScore: format.maxTotalScore, total: entry.totalScore }]

    return <div className="space-y-2">
        {groups.map((group) => <div key={group.label}>
            {group.label && <p className="mb-1 text-xs font-bold text-[#D4AF37]">{group.label}: {group.total} / {group.maxScore}</p>}
            <div className="flex max-w-full flex-wrap gap-1.5">
                {scores.slice(group.startIndex, group.startIndex + group.seriesCount).map((score, index) => <span key={index} className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs font-semibold text-white/70">
                    S{index + 1}: {formatScore(score, ruleSet, entry)}{format.isEventSpecific ? ` / ${format.maxSeriesScore}` : ""}
                </span>)}
            </div>
        </div>)}
    </div>
}
