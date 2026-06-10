import { NextRequest } from "next/server"
import * as XLSX from "xlsx"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { competitionFilePrefix, getCompetitionBySlugOrActive, getCompetitionSlugFromRequest } from "@/lib/competition-server"
import { prisma } from "@/lib/prisma"
import { categorySortValue, formatScore, getRuleSet, getSeriesScores, isEntryScored, rankRows } from "@/lib/results"

function formatExcelScore(score: number | undefined, ruleSet: "NR" | "ISSF") {
    if (typeof score !== "number") return ""
    return ruleSet === "NR" ? score.toFixed(0) : score.toFixed(1)
}

function safeSheetName(value: string, fallback: string, usedNames: Set<string>) {
    const sanitized = value.replace(/[\[\]:*?/\\]/g, " ").replace(/\s+/g, " ").trim() || fallback
    const base = sanitized.slice(0, 31)
    let name = base
    let suffix = 2

    while (usedNames.has(name)) {
        const suffixText = ` ${suffix}`
        name = `${base.slice(0, 31 - suffixText.length)}${suffixText}`
        suffix += 1
    }

    usedNames.add(name)
    return name
}

export async function GET(request: NextRequest) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const competition = await getCompetitionBySlugOrActive(getCompetitionSlugFromRequest(request))
        if (!competition) return Response.json({ error: "Competition not found." }, { status: 404 })

        const registrations = await prisma.registration.findMany({
            where: { competitionId: competition.id },
            orderBy: { createdAt: "asc" },
            include: { entries: { orderBy: { createdAt: "asc" } } },
        })

        const groups = new Map<string, {
            label: string
            rows: {
                registration: typeof registrations[number]
                entry: typeof registrations[number]["entries"][number]
            }[]
        }>()

        registrations.forEach((registration) => {
            registration.entries.forEach((entry) => {
                const group = groups.get(entry.categoryCode) ?? { label: entry.categoryLabel, rows: [] }
                group.rows.push({ registration, entry })
                groups.set(entry.categoryCode, group)
            })
        })

        const workbook = XLSX.utils.book_new()
        const usedSheetNames = new Set<string>()
        const categories = Array.from(groups, ([code, group]) => ({ code, ...group }))
            .sort((a, b) => categorySortValue(a.code).localeCompare(categorySortValue(b.code)))

        if (!categories.length) {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["No category results found."]]), "Results")
        }

        categories.forEach((category) => {
            const rows = rankRows(category.rows).map((row) => {
                const ruleSet = getRuleSet(row.entry)
                const scored = isEntryScored(row.entry)
                const scores = getSeriesScores(row.entry)

                return {
                    Rank: row.rank ?? "",
                    Shooter: row.registration.name,
                    "Academy/Range": row.registration.academy,
                    Event: row.entry.eventTitle,
                    "Category Code": row.entry.categoryCode,
                    "Category Name": row.entry.categoryLabel,
                    "Series 1": scored ? formatExcelScore(scores[0], ruleSet) : "",
                    "Series 2": scored ? formatExcelScore(scores[1], ruleSet) : "",
                    "Series 3": scored ? formatExcelScore(scores[2], ruleSet) : "",
                    "Series 4": scored ? formatExcelScore(scores[3], ruleSet) : "",
                    "Series 5": scored ? formatExcelScore(scores[4], ruleSet) : "",
                    "Series 6": scored ? formatExcelScore(scores[5], ruleSet) : "",
                    "Total 10x": scored ? row.entry.innerTenCount : "",
                    "Total Score": scored ? formatScore(row.entry.totalScore, ruleSet) : "",
                    Status: scored ? "Scored" : "Pending",
                }
            })

            const sheet = XLSX.utils.json_to_sheet(rows)
            sheet["!cols"] = [
                { wch: 8 },
                { wch: 28 },
                { wch: 32 },
                { wch: 22 },
                { wch: 14 },
                { wch: 42 },
                { wch: 10 },
                { wch: 10 },
                { wch: 10 },
                { wch: 10 },
                { wch: 10 },
                { wch: 10 },
                { wch: 10 },
                { wch: 12 },
                { wch: 10 },
            ]
            XLSX.utils.book_append_sheet(workbook, sheet, safeSheetName(category.code, "Category", usedSheetNames))
        })

        const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" })
        return new Response(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${competitionFilePrefix(competition)}-category-results.xlsx"`,
            },
        })
    } catch (error) {
        console.error("Unable to export category results", error)
        return Response.json({ error: "Category results export failed. Check the database connection and migrations." }, { status: 500 })
    }
}
