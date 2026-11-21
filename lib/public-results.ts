import type { Competition } from "@prisma/client"
import { serializeCompetition } from "./competition-server"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { categorySortValue, formatResultTotal, getRuleSet, getSeriesScores, isEntryScored, isTopResultCategory, rankRows } from "@/lib/results"
import { getScoringFormat } from "@/lib/competition"
import { buildTeamStandings } from "@/lib/team-standings"

async function buildRankings(competitionId: string) {
    const registrationsQuery = prisma.registration.findMany({
        where: { competitionId: competitionId },
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

    const teamsQuery = prisma.teamEntry.findMany({
        where: { competitionId },
        select: {
            id: true, name: true, academy: true, teamType: true, discipline: true,
            members: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { registrationEntryId: true } },
        },
    })
    const [registrations, teams] = await Promise.all([registrationsQuery, teamsQuery])

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
            innerTenCount: getScoringFormat(ruleSet, row.entry).usesInnerTens ? row.entry.innerTenCount : 0,
            totalScore: row.entry.totalScore,
            displayTotal: formatResultTotal(row.entry),
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
                return {
                    code: category.code,
                    label: category.label,
                    rows: rows.map(formatRow),
                }
            })
    }

    const categories = buildCategories(false)
    const paraCategories = buildCategories(true)
    const teamStandings = buildTeamStandings(teams, [...categories, ...paraCategories].flatMap(category => category.rows))

    const buildTopStudentGroup = (title: string, rangeLabel: string, prefix: "S" | "R", min: number, max: number) => {
        const rows = registrations.flatMap((registration) =>
            registration.entries
                .filter((entry) => !entry.isPara)
                .filter((entry) => isTopResultCategory(entry, prefix, min, max))
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

    return { categories, paraCategories, topStudents, teamStandings, summary: { categories: categories.length, paraCategories: paraCategories.length } }
}

function getPublicRankings(competitionId: string, revision: string) {
    return unstable_cache(() => buildRankings(competitionId), ["public-rankings-v2", competitionId, revision], { revalidate: 300 })()
}

// Keep only the latest encoded response per active event. Concurrent viewers share
// an in-flight build and separate server instances use the versioned Next cache.
const recent = new Map<string, { revision: string; bodies: Promise<{ tv: string; full: string }> }>()

export function getResultBodies(competition: Competition, revision: string) {
    const found = recent.get(competition.id)
    if (found?.revision === revision) return found.bodies
    if (!found && recent.size >= 8) recent.delete(recent.keys().next().value!)
    const bodies = encodeResults(competition, revision)
    recent.set(competition.id, { revision, bodies })
    void bodies.catch(() => {
        if (recent.get(competition.id)?.bodies === bodies) recent.delete(competition.id)
    })
    return bodies
}

async function encodeResults(competition: Competition, generatedAt: string) {
    const rankings = await getPublicRankings(competition.id, generatedAt)
    const topStudents = rankings.topStudents.map(({ title, rangeLabel, rows }) => ({
        title, rangeLabel, rows: rows.slice(0, 10).map(({ id, rank, shooterName, academy, categoryCode, eventTitle, innerTenCount, displayTotal, studentPhotoPath }) => ({
            id, rank, shooterName, academy, categoryCode, eventTitle, innerTenCount, displayTotal,
            studentPhotoPath: rank !== null && rank <= 3 ? studentPhotoPath : null,
        })),
    }))
    return {
        tv: JSON.stringify({ competition: { slug: competition.slug, shortTitle: competition.shortTitle }, generatedAt, topStudents }),
        full: JSON.stringify({ competition: serializeCompetition(competition), generatedAt, ...rankings }),
    }
}
