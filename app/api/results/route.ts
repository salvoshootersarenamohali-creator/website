import { NextRequest } from "next/server"
import { getCompetitionBySlugOrActive, getCompetitionSlugFromRequest, serializeCompetition } from "@/lib/competition-server"
import { prisma } from "@/lib/prisma"
import { categorySortValue, formatScore, getRuleSet, getSeriesScores, isEntryScored, rankRows } from "@/lib/results"

export const dynamic = "force-dynamic"

function isCategoryInNumberRange(code: string, prefix: "S" | "R", min: number, max: number) {
    const match = code.trim().toUpperCase().match(/^([SR])-(\d+)$/)
    if (!match || match[1] !== prefix) return false
    const number = Number(match[2])
    return Number.isInteger(number) && number >= min && number <= max
}

export async function GET(request: NextRequest) {
    try {
        const slug = getCompetitionSlugFromRequest(request)
        const competition = await getCompetitionBySlugOrActive(slug)
        if (!competition || !competition.isPublished || (!competition.resultsPublished && !competition.registrationOpen)) {
            return Response.json({ error: "Results are not available for this competition." }, { status: 404 })
        }

        const registrations = await prisma.registration.findMany({
            where: { competitionId: competition.id },
            orderBy: { createdAt: "asc" },
            select: {
                name: true,
                academy: true,
                studentPhotoPath: true,
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
                        innerTenCount: true,
                        totalScore: true,
                        isPara: true,
                    },
                },
            },
        })

        const formatRow = (row: {
            rank: number | null
            registration: {
                name: string
                academy: string
                studentPhotoPath: string | null
            }
            entry: typeof registrations[number]["entries"][number]
        }) => {
            const ruleSet = getRuleSet(row.entry)
            const seriesScores = getSeriesScores(row.entry)
            return {
                id: row.entry.id,
                rank: row.rank,
                shooterName: row.registration.name,
                academy: row.registration.academy,
                studentPhotoPath: row.registration.studentPhotoPath,
                eventId: row.entry.eventId,
                eventTitle: row.entry.eventTitle,
                categoryCode: row.entry.categoryCode,
                categoryLabel: row.entry.categoryLabel,
                ruleSet,
                scored: isEntryScored(row.entry),
                seriesScores,
                innerTenCount: row.entry.innerTenCount,
                totalScore: row.entry.totalScore,
                displayTotal: formatScore(row.entry.totalScore, ruleSet),
                isPara: row.entry.isPara,
            }
        }

        const buildCategories = (isPara: boolean) => {
            const groups = new Map<string, {
                code: string
                label: string
                rows: {
                    registration: {
                        name: string
                        academy: string
                        studentPhotoPath: string | null
                    }
                    entry: typeof registrations[number]["entries"][number]
                }[]
            }>()

            registrations.forEach((registration) => {
                registration.entries
                    .filter((entry) => entry.isPara === isPara)
                    .forEach((entry) => {
                        const group = groups.get(entry.categoryCode) ?? {
                            code: entry.categoryCode,
                            label: entry.categoryLabel,
                            rows: [],
                        }
                        group.rows.push({
                            registration: {
                                name: registration.name,
                                academy: registration.academy,
                                studentPhotoPath: registration.studentPhotoPath,
                            },
                            entry,
                        })
                        groups.set(entry.categoryCode, group)
                    })
            })

            return Array.from(groups.values())
                .sort((a, b) => categorySortValue(a.code).localeCompare(categorySortValue(b.code)))
                .map((category) => {
                    const rows = rankRows(category.rows)
                    const scoredCount = rows.filter((row) => isEntryScored(row.entry)).length
                    return {
                        code: category.code,
                        label: category.label,
                        entryCount: rows.length,
                        scoredCount,
                        rows: rows.map(formatRow),
                    }
                })
        }

        const categories = buildCategories(false)
        const paraCategories = buildCategories(true)

        const buildTopStudentGroup = (title: string, rangeLabel: string, prefix: "S" | "R", min: number, max: number) => {
            const rows = registrations.flatMap((registration) =>
                registration.entries
                    .filter((entry) => !entry.isPara)
                    .filter((entry) => isCategoryInNumberRange(entry.categoryCode, prefix, min, max))
                    .filter(isEntryScored)
                    .map((entry) => ({
                        registration: {
                            name: registration.name,
                            academy: registration.academy,
                            studentPhotoPath: registration.studentPhotoPath,
                        },
                        entry,
                    }))
            )

            return {
                title,
                rangeLabel,
                rows: rankRows(rows).map(formatRow),
            }
        }

        const topStudents = [
            buildTopStudentGroup("ISSF Pistol Top Students", "Combined S-01 to S-10", "S", 1, 10),
            buildTopStudentGroup("ISSF Rifle Top Students", "Combined R-01 to R-08", "R", 1, 8),
            buildTopStudentGroup("NR Pistol Top Students", "Combined S-11 to S-24", "S", 11, 24),
            buildTopStudentGroup("NR Rifle Top Students", "Combined R-11 to R-24", "R", 11, 24),
        ]

        return Response.json({
            competition: serializeCompetition(competition),
            generatedAt: new Date().toISOString(),
            summary: {
                categories: categories.length,
                entries: categories.reduce((sum, category) => sum + category.entryCount, 0),
                scored: categories.reduce((sum, category) => sum + category.scoredCount, 0),
                paraCategories: paraCategories.length,
                paraEntries: paraCategories.reduce((sum, category) => sum + category.entryCount, 0),
                paraScored: paraCategories.reduce((sum, category) => sum + category.scoredCount, 0),
            },
            categories,
            paraCategories,
            topStudents,
        })
    } catch (error) {
        console.error("Unable to load public results", error)
        return Response.json({ error: "Unable to load results right now." }, { status: 500 })
    }
}
