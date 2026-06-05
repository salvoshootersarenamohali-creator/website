import { prisma } from "@/lib/prisma"
import { categorySortValue, formatScore, getRuleSet, getSeriesInnerTenCounts, getSeriesScores, isEntryScored, rankRows } from "@/lib/results"

export const dynamic = "force-dynamic"

export async function GET() {
    try {
        const registrations = await prisma.registration.findMany({
            orderBy: { createdAt: "asc" },
            select: {
                name: true,
                academy: true,
                dateOfBirth: true,
                entries: {
                    orderBy: { createdAt: "asc" },
                    select: {
                        id: true,
                        eventId: true,
                        eventTitle: true,
                        ruleSet: true,
                        categoryCode: true,
                        categoryLabel: true,
                        seriesScores: true,
                        seriesInnerTenCounts: true,
                        innerTenCount: true,
                        totalScore: true,
                    },
                },
            },
        })

        const groups = new Map<string, {
            code: string
            label: string
            rows: {
                registration: {
                    name: string
                    academy: string
                    dateOfBirth: Date
                }
                entry: typeof registrations[number]["entries"][number]
            }[]
        }>()

        registrations.forEach((registration) => {
            registration.entries.forEach((entry) => {
                const group = groups.get(entry.categoryCode) ?? {
                    code: entry.categoryCode,
                    label: entry.categoryLabel,
                    rows: [],
                }
                group.rows.push({
                    registration: {
                        name: registration.name,
                        academy: registration.academy,
                        dateOfBirth: registration.dateOfBirth,
                    },
                    entry,
                })
                groups.set(entry.categoryCode, group)
            })
        })

        const categories = Array.from(groups.values())
            .sort((a, b) => categorySortValue(a.code).localeCompare(categorySortValue(b.code)))
            .map((category) => {
                const rows = rankRows(category.rows)
                const scoredCount = rows.filter((row) => isEntryScored(row.entry)).length
                return {
                    code: category.code,
                    label: category.label,
                    entryCount: rows.length,
                    scoredCount,
                    rows: rows.map((row) => {
                        const ruleSet = getRuleSet(row.entry)
                        const seriesScores = getSeriesScores(row.entry)
                        return {
                            id: row.entry.id,
                            rank: row.rank,
                            shooterName: row.registration.name,
                            academy: row.registration.academy,
                            eventId: row.entry.eventId,
                            eventTitle: row.entry.eventTitle,
                            categoryCode: row.entry.categoryCode,
                            categoryLabel: row.entry.categoryLabel,
                            ruleSet,
                            scored: isEntryScored(row.entry),
                            seriesScores,
                            seriesInnerTenCounts: getSeriesInnerTenCounts(row.entry),
                            innerTenCount: row.entry.innerTenCount,
                            totalScore: row.entry.totalScore,
                            displayTotal: formatScore(row.entry.totalScore, ruleSet),
                        }
                    }),
                }
            })

        return Response.json({
            generatedAt: new Date().toISOString(),
            summary: {
                categories: categories.length,
                entries: categories.reduce((sum, category) => sum + category.entryCount, 0),
                scored: categories.reduce((sum, category) => sum + category.scoredCount, 0),
            },
            categories,
        })
    } catch (error) {
        console.error("Unable to load public results", error)
        return Response.json({ error: "Unable to load results right now." }, { status: 500 })
    }
}
