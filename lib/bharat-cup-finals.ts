import { bharatCupShooterKey } from "@/lib/bharat-cup"
import { getCompetitionCategories, getSeriesCount, isLittleChampCategory, type CompetitionEvent, type Gender } from "@/lib/competition"

const finals = [
    { id: "nr-air-pistol", title: "NR Air Pistol COC Finals" },
    { id: "issf-air-pistol", title: "ISSF Air Pistol Finals" },
    { id: "nr-air-rifle", title: "NR Air Rifle COC Finals" },
    { id: "issf-air-rifle", title: "ISSF Air Rifle COC Finals" },
] as const

type QualifyingEntry = {
    id: string
    eventId: string
    categoryCode: string
    isPara: boolean
    seriesScores: unknown
    totalScore: number | null
    registration: { name: string; academy: string; gender: string }
}

type Shooter = {
    id: string
    name: string
    academy: string
    total: number
    lastSeries: number
    secondLastSeries: number
}

function compareScores(a: Shooter, b: Shooter) {
    return b.total - a.total || b.lastSeries - a.lastSeries || b.secondLastSeries - a.secondLastSeries
}

function rankFinalists(shooters: Shooter[], limit: number) {
    shooters.sort((a, b) => compareScores(a, b) || a.name.localeCompare(b.name) || a.academy.localeCompare(b.academy))

    // The workbook can store the same shooter in separate registrations for different matches.
    const seen = new Set<string>()
    const unique = shooters.filter((shooter) => {
        const key = bharatCupShooterKey(shooter.name, shooter.academy)
        if (seen.has(key)) return false
        seen.add(key)
        return true
    })

    let rank = 0
    const ranked = unique.map((shooter, index) => {
        if (index === 0 || compareScores(unique[index - 1], shooter) !== 0) rank = index + 1
        return { ...shooter, rank }
    })
    const cutoffRank = ranked[limit - 1]?.rank
    const hasCutoffTie = cutoffRank !== undefined && ranked[limit]?.rank === cutoffRank
    const qualifiers = hasCutoffTie ? ranked.slice(0, cutoffRank - 1) : ranked.slice(0, limit)
    return {
        limit,
        qualifiers,
        cutoffTie: hasCutoffTie ? ranked.filter((shooter) => shooter.rank === cutoffRank) : [],
    }
}

function isFiniteScore(score: unknown): score is number {
    return typeof score === "number" && Number.isFinite(score)
}

export function getBharatCupFinals(entries: QualifyingEntry[], events: CompetitionEvent[]) {
    return finals.map((final) => {
        const event = events.find(({ id }) => id === final.id)
        const categories = new Map(event ? getCompetitionCategories(event)
            .filter((category) => !isLittleChampCategory(category) && !/\(mix\)\s*$/i.test(category.code))
            .map((category) => [category.code.trim().toUpperCase(), category.gender] as const) : [])
        const groups: Record<Gender, Shooter[]> = { male: [], female: [] }

        if (event) {
            const seriesCount = getSeriesCount(event.ruleSet)
            for (const entry of entries) {
                const categoryGender = categories.get(entry.categoryCode.trim().toUpperCase())
                const gender = categoryGender === "open" ? entry.registration.gender : categoryGender
                const { seriesScores, totalScore } = entry
                if (entry.eventId !== event.id || entry.isPara || (gender !== "male" && gender !== "female")
                    || !isFiniteScore(totalScore) || !Array.isArray(seriesScores) || seriesScores.length !== seriesCount
                    || !seriesScores.every(isFiniteScore)) continue

                groups[gender].push({
                    id: entry.id,
                    name: entry.registration.name,
                    academy: entry.registration.academy,
                    total: totalScore,
                    lastSeries: seriesScores[seriesCount - 1],
                    secondLastSeries: seriesScores[seriesCount - 2],
                })
            }
        }

        return { ...final, boys: rankFinalists(groups.male, 6), girls: rankFinalists(groups.female, 4) }
    })
}

export type BharatCupFinal = ReturnType<typeof getBharatCupFinals>[number]
