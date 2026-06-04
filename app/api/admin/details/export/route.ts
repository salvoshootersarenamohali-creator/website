import { NextRequest } from "next/server"
import * as XLSX from "xlsx"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import {
    buildDetailSchedule,
    defaultDetailLanes,
    defaultFirstSightingTimes,
    DetailLaneConfig,
    DetailScheduleConfig,
    formatDisplayDate,
    normalizeRuleSet,
    RuleSet,
    sanitizeLaneLabels,
} from "@/lib/details"
import { prisma } from "@/lib/prisma"

const VENUE = "SALVO SHOOTERS ARENA SEC- 86, MOHALI"

function isValidDateText(value: unknown): value is string {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isValidTimeText(value: unknown): value is string {
    return typeof value === "string" && /^\d{2}:\d{2}$/.test(value)
}

function readStringArray(value: unknown, fallback: string[]) {
    if (!Array.isArray(value)) return fallback
    const labels = value.filter((item): item is string => typeof item === "string")
    const sanitized = sanitizeLaneLabels(labels)
    return sanitized.length ? sanitized : fallback
}

function parseBody(body: Record<string, unknown>): DetailScheduleConfig {
    const date = isValidDateText(body.date) ? body.date : ""
    if (!date) throw new Error("Choose a valid detail date.")

    const requestedRuleSets = Array.isArray(body.ruleSets)
        ? body.ruleSets.filter((value): value is string => typeof value === "string").map(normalizeRuleSet)
        : []
    const ruleSets = Array.from(new Set(requestedRuleSets.length ? requestedRuleSets : ["NR", "ISSF"])) as RuleSet[]

    const laneBody = typeof body.lanes === "object" && body.lanes !== null ? body.lanes as Record<string, unknown> : {}
    const lanes: DetailLaneConfig = {
        manual: readStringArray(laneBody.manual, defaultDetailLanes.manual),
        electronic: readStringArray(laneBody.electronic, defaultDetailLanes.electronic),
    }

    const timeBody = typeof body.firstSightingTimes === "object" && body.firstSightingTimes !== null ? body.firstSightingTimes as Record<string, unknown> : {}
    const nrFirstSightingTime = timeBody.NR
    const issfFirstSightingTime = timeBody.ISSF
    const firstSightingTimes: Record<RuleSet, string> = {
        NR: isValidTimeText(nrFirstSightingTime) ? nrFirstSightingTime : defaultFirstSightingTimes.NR,
        ISSF: isValidTimeText(issfFirstSightingTime) ? issfFirstSightingTime : defaultFirstSightingTimes.ISSF,
    }

    return { date, ruleSets, lanes, firstSightingTimes }
}

function timeForSheet(value: string) {
    return `${value}:00`
}

function buildRuleSetSheet(schedule: ReturnType<typeof buildDetailSchedule>, ruleSet: RuleSet) {
    const rows: (string | number | null)[][] = []
    const merges: XLSX.Range[] = []
    const details = schedule.details.filter((detail) => detail.ruleSet === ruleSet)
    const maxColumns = ruleSet === "ISSF" ? 6 : 5

    if (!details.length) {
        return XLSX.utils.aoa_to_sheet([
            ["36th SALVO CUP"],
            [`No ${ruleSet} entries found for ${formatDisplayDate(schedule.date)}.`],
        ])
    }

    details.forEach((detail) => {
        const startRow = rows.length
        rows.push(["36th SALVO CUP", null, null, null, null, null].slice(0, maxColumns))
        rows.push(["DETAIL NO.", `${detail.detailNumber} (${ruleSet})`, null, "REPORTING TIME:", timeForSheet(detail.reportingTime), null].slice(0, maxColumns))
        rows.push([null, null, null, "SIGHTING TIME:", timeForSheet(detail.sightingTime), null].slice(0, maxColumns))
        rows.push(["DATE:", formatDisplayDate(detail.date), null, "MATCH TIME:", timeForSheet(detail.matchTime), null].slice(0, maxColumns))
        if (ruleSet === "ISSF") {
            rows.push([null, null, null, "MATCH END:", detail.matchEndTime ? timeForSheet(detail.matchEndTime) : "", null])
        }
        rows.push([VENUE, null, null, null, null, null].slice(0, maxColumns))
        rows.push(["SR. NO.", "NAME", "MATCH NO.", "NAME OF ACADEMY/CLUB", "LANE NO.", "EVENT"].slice(0, maxColumns))
        detail.rows.forEach((row) => {
            rows.push([row.serial, row.name, row.matchNo, row.academy, row.laneNo, row.eventTitle].slice(0, maxColumns))
        })
        rows.push([null, null, null, null, null, null].slice(0, maxColumns))

        merges.push({ s: { r: startRow, c: 0 }, e: { r: startRow, c: maxColumns - 1 } })
        merges.push({ s: { r: ruleSet === "ISSF" ? startRow + 5 : startRow + 4, c: 0 }, e: { r: ruleSet === "ISSF" ? startRow + 5 : startRow + 4, c: maxColumns - 1 } })
    })

    const sheet = XLSX.utils.aoa_to_sheet(rows)
    sheet["!merges"] = merges
    sheet["!cols"] = [
        { wch: 9 },
        { wch: 28 },
        { wch: 12 },
        { wch: 32 },
        { wch: 12 },
        { wch: 20 },
    ].slice(0, maxColumns)
    return sheet
}

export async function POST(request: NextRequest) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const body = await request.json() as Record<string, unknown>
        const config = parseBody(body)
        const registrations = await prisma.registration.findMany({
            orderBy: { createdAt: "asc" },
            include: { entries: { orderBy: { createdAt: "asc" } } },
        })
        const schedule = buildDetailSchedule(registrations, config)
        const workbook = XLSX.utils.book_new()

        config.ruleSets.forEach((ruleSet) => {
            const sheetName = `${ruleSet} Details`
            XLSX.utils.book_append_sheet(workbook, buildRuleSetSheet(schedule, ruleSet), sheetName)
        })

        const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" })
        return new Response(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="36th-salvo-cup-details-${config.date}.xlsx"`,
            },
        })
    } catch (error) {
        console.error("Unable to export detail sheets", error)
        const message = error instanceof Error ? error.message : "Detail export failed."
        return Response.json({ error: message }, { status: 500 })
    }
}
