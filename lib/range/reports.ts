import { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import * as XLSX from "xlsx"
import { prisma } from "@/lib/prisma"
import { RangeActor, RangeError, formatRangeTime, rangeDay } from "./shared"
import { ownerOnly } from "./server"
import { financeInclude } from "./finance"
import { reportDates, reportScope } from "./report-scope"
import { RangeReportType, ReportResult, ReportRow, reportLabels, reportStatuses, summaryLabels } from "./report-types"

type Db = Prisma.TransactionClient
type Options = ReturnType<typeof readOptions> & { ids: string[]; locationNames: Map<string, string>; allLocations: boolean }
function readOptions(request: NextRequest) {
    const query = request.nextUrl.searchParams, report = query.get("report") || "finance"
    if (!Object.prototype.hasOwnProperty.call(reportLabels, report)) throw new RangeError("Choose a valid report.")
    const type = report as RangeReportType, dates = reportDates(request, type === "dailyRoll"), status = query.get("status") || "all"
    if (!reportStatuses(type).includes(status)) throw new RangeError("Invalid status for this report.")
    const page = Number(query.get("page") || 1)
    if (!Number.isInteger(page) || page < 1 || page > 100000) throw new RangeError("Invalid report page.")
    const method = query.get("method") || "", flow = query.get("flow") || "", month = query.get("month") || ""
    if (method && !["cash", "online"].includes(method)) throw new RangeError("Invalid payment method.")
    if (flow && !["income", "expense", "transfer"].includes(flow)) throw new RangeError("Invalid transaction type.")
    if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new RangeError("Invalid salary month.")
    if ((query.get("accountId") || method) && !["finance", "fees", "salaries", "transfers"].includes(type)) throw new RangeError("Account filters do not apply to this report.")
    if (query.get("categoryId") && !["finance", "fees"].includes(type)) throw new RangeError("Category filters do not apply to this report.")
    if (query.get("studentId") && !["finance", "fees", "studentAttendance", "dailyRoll"].includes(type)) throw new RangeError("Student filters do not apply to this report.")
    if (query.get("personId") && type === "dailyRoll") throw new RangeError("Staff filters do not apply to the daily roll.")
    if ((flow && type !== "finance") || (month && type !== "salaries")) throw new RangeError("A selected filter does not apply to this report.")
    if (type === "dailyRoll" && dates.from !== dates.to) throw new RangeError("Choose one date for the daily student roll.")
    return { ...dates, type, status, page, method, flow, month, personId: query.get("personId") || "", studentId: query.get("studentId") || "", categoryId: query.get("categoryId") || "", accountId: query.get("accountId") || "", search: (query.get("search") || "").trim().slice(0, 100), exporting: query.get("export") === "1" }
}
export async function reportMeta(request: NextRequest, actor: RangeActor) {
    ownerOnly(actor)
    const locations = await reportScope(request, actor), ids = locations.map(l => l.id)
    const [people, students, accounts, categories] = await Promise.all([
        prisma.rangeUser.findMany({ where: { role: { in: ["owner", "coach"] } }, select: { id: true, name: true, role: true, active: true }, orderBy: { name: "asc" } }),
        prisma.rangeShooterProfile.findMany({ where: { enrollments: { some: { locationId: { in: ids } } } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
        prisma.rangeMoneyAccount.findMany({ where: { locationId: { in: ids } }, select: { id: true, name: true, location: { select: { name: true } } }, orderBy: { name: "asc" } }),
        prisma.rangeFinanceCategory.findMany({ where: { locationId: { in: ids } }, select: { id: true, name: true, kind: true }, orderBy: { name: "asc" } }),
    ])
    return Response.json({ people, students, accounts: accounts.map(a => ({ id: a.id, name: `${a.location.name} · ${a.name}` })), categories, locations })
}
function financeWhere(o: Options): Prisma.RangeFinanceTransactionWhereInput {
    const where: Prisma.RangeFinanceTransactionWhereInput = { locationId: { in: o.ids }, occurredOn: { gte: o.from, lte: o.to }, ...(o.status !== "all" ? { status: o.status } : {}), ...(o.categoryId ? { categoryId: o.categoryId } : {}), ...(o.accountId || o.method ? { movements: { some: { ...(o.accountId ? { accountId: o.accountId } : {}), ...(o.method ? { method: o.method } : {}) } } } : {}) }
    if (o.type === "fees") { where.source = "studentFee"; if (o.personId) where.recordedById = o.personId; if (o.studentId) where.studentFee = { enrollment: { profileId: o.studentId } } }
    else if (o.type === "salaries") { where.source = "salary"; where.salaryPayment = { ...(o.personId ? { coachId: o.personId } : {}), ...(o.month ? { salaryMonth: o.month } : {}) } }
    else { if (o.personId) where.recordedById = o.personId; if (o.studentId) where.studentFee = { enrollment: { profileId: o.studentId } }; if (o.flow) where.kind = o.flow }
    if (o.search) where.OR = [{ description: { contains: o.search, mode: "insensitive" } }, { categoryName: { contains: o.search, mode: "insensitive" } }, { recordedBy: { name: { contains: o.search, mode: "insensitive" } } }]
    return where
}
async function financeSummary(db: Db, where: Prisma.RangeFinanceTransactionWhereInput, o: Options) {
    if (o.status === "void") return { incomePaise: 0, expensePaise: 0, transferNetPaise: 0, netPaise: 0 }
    const sums = await Promise.all(["income", "expense", "transfer"].map(kind => db.rangeMoneyMovement.aggregate({ where: { ...(o.accountId ? { accountId: o.accountId } : {}), ...(o.method ? { method: o.method } : {}), transaction: { ...where, status: "posted", ...(where.kind && where.kind !== kind ? { id: "no-match" } : {}), kind } }, _sum: { amountPaise: true } })))
    const incomePaise = sums[0]._sum.amountPaise || 0, expensePaise = -(sums[1]._sum.amountPaise || 0), transferNetPaise = sums[2]._sum.amountPaise || 0
    return { incomePaise, expensePaise, transferNetPaise, netPaise: incomePaise - expensePaise + transferNetPaise }
}
type Entry = Prisma.RangeFinanceTransactionGetPayload<{ include: typeof financeInclude }>
function financeRow(entry: Entry, o: Options): ReportRow {
    const parts = entry.movements.filter(p => (!o.accountId || p.accountId === o.accountId) && (!o.method || p.method === o.method))
    return { Location: o.locationNames.get(entry.locationId) || "", Date: entry.occurredOn, Type: entry.kind, Source: entry.source, Description: entry.description, Category: entry.categoryName, "Transaction total (₹)": entry.amountPaise / 100, "Net movement in view (₹)": entry.status === "posted" ? parts.reduce((sum, p) => sum + p.amountPaise, 0) / 100 : 0, "Recorded by": entry.recordedBy.name, "Payment parts": entry.movements.map(p => `${p.method}: ${p.account.name} ₹${(Math.abs(p.amountPaise) / 100).toFixed(2)}${p.reference ? ` (${p.reference})` : ""}`).join("; "), Status: entry.status, "Has receipt": entry.receiptId ? "Yes" : "No" }
}
async function pageRows<T>(count: Promise<number>, find: () => Promise<T[]>, o: Options) {
    const total = await count
    if (o.exporting && total > 5000) throw new RangeError("This export exceeds 5,000 records. Narrow the date range or filters.", 413)
    return { total, records: await find() }
}

async function queryReport(db: Db, o: Options): Promise<{ rows: ReportRow[]; total: number; summary: Record<string, number>; hint: string }> {
    const take = o.exporting ? 5000 : 50, skip = o.exporting ? 0 : (o.page - 1) * 50
    if (["finance", "fees", "salaries"].includes(o.type)) {
        const where = financeWhere(o)
        const data = await pageRows(db.rangeFinanceTransaction.count({ where }), () => db.rangeFinanceTransaction.findMany({ where, include: { ...financeInclude, studentFee: { include: { enrollment: { include: { profile: true } } } }, salaryPayment: { include: { coach: { select: { name: true } } } } }, orderBy: [{ occurredOn: "desc" }, { id: "asc" }], take, skip }), o)
        const rows = data.records.map(entry => {
            const row = financeRow(entry, o)
            if (o.type === "fees") return { Student: entry.studentFee?.enrollment.profile.name || "", "Payment for": entry.studentFee?.type || "", "Months covered": entry.studentFee?.months || 0, "Coverage starts": entry.studentFee?.coverageStart || "", "Coverage through": entry.studentFee?.coverageEnd || "", ...row }
            if (o.type === "salaries") return { Coach: entry.salaryPayment?.coach.name || "", "Salary month": entry.salaryPayment?.salaryMonth || "", ...row }
            return row
        })
        return { rows, total: data.total, summary: await financeSummary(db, where, o), hint: "Totals include posted entries only. Account/method filters total only the matching payment parts; transaction totals retain the full payment. Transfers never count as income or expenses." }
    }
    if (o.type === "coachAttendance") {
        const where: Prisma.RangeShiftWhereInput = { locationId: { in: o.ids }, inAt: { lt: o.window.lt }, OR: [{ outAt: null }, { outAt: { gt: o.window.gte } }], ...(o.personId ? { userId: o.personId } : {}), ...(o.status === "open" ? { outAt: null } : o.status === "completed" ? { outAt: { not: null } } : {}), ...(o.search ? { user: { name: { contains: o.search, mode: "insensitive" } } } : {}) }
        const data = await pageRows(db.rangeShift.count({ where }), () => db.rangeShift.findMany({ where, include: { user: { select: { name: true } } }, orderBy: [{ inAt: "desc" }, { id: "asc" }], take, skip }), o)
        const hours = (s: { inAt: Date; outAt: Date | null }) => s.outAt ? Math.max(0, Math.min(s.outAt.getTime(), o.window.lt.getTime()) - Math.max(s.inAt.getTime(), o.window.gte.getTime())) / 3600000 : 0
        const completed = o.status === "open" ? [] : await db.rangeShift.findMany({ where: { ...where, outAt: { not: null } }, select: { inAt: true, outAt: true } })
        return { total: data.total, summary: { completedHours: Number(completed.reduce((sum, s) => sum + hours(s), 0).toFixed(2)) }, hint: "Shifts overlapping the date range are included. Completed hours are clipped to India midnight boundaries; open shifts have no calculated departure or hours.", rows: data.records.map(s => ({ Location: o.locationNames.get(s.locationId) || "", Coach: s.user.name, "Arrival (IST)": formatRangeTime(s.inAt), "Departure (IST)": s.outAt ? formatRangeTime(s.outAt) : "Open", "Completed hours in period": Number(hours(s).toFixed(2)), "Original camera arrival (IST)": s.originalInAt ? formatRangeTime(s.originalInAt) : "", "Original camera departure (IST)": s.originalOutAt ? formatRangeTime(s.originalOutAt) : "", Evidence: `${s.inPhoto ? "Arrival photo" : "No arrival photo"}; ${s.outPhoto ? "Departure photo" : "No departure photo"}`, "Owner adjusted": s.adjusted ? "Yes" : "No" })) }
    }
    if (o.type === "studentAttendance") {
        const where: Prisma.RangeStudentAttendanceWhereInput = { date: { gte: o.from, lte: o.to }, enrollment: { locationId: { in: o.ids }, ...(o.studentId ? { profileId: o.studentId } : {}), ...(o.search ? { profile: { name: { contains: o.search, mode: "insensitive" } } } : {}) }, ...(o.personId ? { markedById: o.personId } : {}), ...(o.status !== "all" ? { status: o.status } : {}) }
        const data = await pageRows(db.rangeStudentAttendance.count({ where }), () => db.rangeStudentAttendance.findMany({ where, include: { enrollment: { include: { profile: true } }, markedBy: { select: { name: true } } }, orderBy: [{ date: "desc" }, { id: "asc" }], take, skip }), o)
        const groups = await db.rangeStudentAttendance.groupBy({ by: ["status"], where, _count: true })
        return { total: data.total, summary: Object.fromEntries(groups.map(g => [g.status, g._count])), hint: "This history lists recorded marks. Dates without a record remain Not marked; use Daily student roll to export the complete roster for one day.", rows: data.records.map(r => ({ Location: o.locationNames.get(r.enrollment.locationId) || "", Date: r.date, Student: r.enrollment.profile.name, Discipline: r.enrollment.discipline, Status: r.status, "Marked by": r.markedBy.name, "Last changed (IST)": formatRangeTime(r.updatedAt) })) }
    }
    if (o.type === "dailyRoll") {
        const where: Prisma.RangeEnrollmentWhereInput = { locationId: { in: o.ids }, startDate: { lte: o.from }, AND: [{ OR: [{ endDate: null }, { endDate: { gte: o.from } }] }], ...(o.from === rangeDay() ? { active: true } : {}), ...(o.studentId ? { profileId: o.studentId } : {}), ...(o.search ? { profile: { name: { contains: o.search, mode: "insensitive" } } } : {}) }
        if (o.status === "unmarked") where.OR = [{ attendance: { none: { date: o.from } } }, { attendance: { some: { date: o.from, status: "unmarked" } } }]
        else if (o.status !== "all") where.attendance = { some: { date: o.from, status: o.status } }
        const data = await pageRows(db.rangeEnrollment.count({ where }), () => db.rangeEnrollment.findMany({ where, include: { profile: true, attendance: { where: { date: o.from }, include: { markedBy: { select: { name: true } } } } }, orderBy: [{ profile: { name: "asc" } }, { id: "asc" }], take, skip }), o)
        const allMarks = await db.rangeEnrollment.findMany({ where, select: { attendance: { where: { date: o.from }, select: { status: true } } } })
        const summary: Record<string, number> = { present: 0, absent: 0, leave: 0, unmarked: 0 }
        allMarks.forEach(s => { const status = s.attendance[0]?.status || "unmarked"; summary[status]++ })
        return { total: data.total, summary, hint: "Each eligible student appears once. Missing attendance stays Not marked. Today's roll excludes inactive students; historical rolls use enrollment start/end dates.", rows: data.records.map(s => ({ Location: o.locationNames.get(s.locationId) || "", Date: o.from, Student: s.profile.name, Discipline: s.discipline, Status: s.attendance[0]?.status || "unmarked", "Marked by": s.attendance[0]?.markedBy.name || "", "Student phone": s.profile.phone || "", "Guardian name": s.profile.guardianName || "", "Guardian phone": s.profile.guardianPhone || "" })) }
    }
    if (o.type === "transfers") {
        const conditions: Prisma.RangeTransferWhereInput[] = []
        if (o.personId) conditions.push({ OR: [{ requestedById: o.personId }, { fromAccount: { coachId: o.personId } }, { toAccount: { coachId: o.personId } }] })
        if (o.accountId) conditions.push({ OR: [{ fromAccountId: o.accountId }, { toAccountId: o.accountId }] })
        if (o.method) conditions.push({ OR: [{ fromAccount: { channel: o.method } }, { toAccount: { channel: o.method } }] })
        if (o.search) conditions.push({ OR: [{ notes: { contains: o.search, mode: "insensitive" } }, { fromAccount: { name: { contains: o.search, mode: "insensitive" } } }, { toAccount: { name: { contains: o.search, mode: "insensitive" } } }] })
        const where: Prisma.RangeTransferWhereInput = { locationId: { in: o.ids }, occurredOn: { gte: o.from, lte: o.to }, ...(o.status !== "all" ? { status: o.status } : {}), AND: conditions }
        const data = await pageRows(db.rangeTransfer.count({ where }), () => db.rangeTransfer.findMany({ where, include: { fromAccount: true, toAccount: true, requestedBy: { select: { name: true } } }, orderBy: [{ occurredOn: "desc" }, { id: "asc" }], take, skip }), o)
        const groups = await db.rangeTransfer.groupBy({ by: ["status"], where, _count: true })
        return { total: data.total, summary: Object.fromEntries(groups.map(g => [g.status, g._count])), hint: "Only confirmed transfers affect balances. Handovers do not create income or expenses; rejected requests and reversed ledger records are retained in history.", rows: data.records.map(t => ({ Location: o.locationNames.get(t.locationId) || "", Date: t.occurredOn, From: t.fromAccount.name, To: t.toAccount.name, "Amount (₹)": t.amountPaise / 100, Status: t.status, "Submitted by": t.requestedBy.name, Details: t.notes, Reference: t.reference || "", "Owner decision (IST)": t.resolvedAt ? formatRangeTime(t.resolvedAt) : "", "Owner note": t.resolution || "" })) }
    }
    const where: Prisma.RangeAuditWhereInput = { ...(o.allLocations ? { OR: [{ locationId: { in: o.ids } }, { locationId: null }] } : { locationId: { in: o.ids } }), createdAt: o.window, ...(o.personId ? { actorId: o.personId } : {}), ...(o.search ? { AND: [{ OR: [{ action: { contains: o.search, mode: "insensitive" } }, { reason: { contains: o.search, mode: "insensitive" } }, { actor: { name: { contains: o.search, mode: "insensitive" } } }] }] } : {}) }
    const data = await pageRows(db.rangeAudit.count({ where }), () => db.rangeAudit.findMany({ where, include: { actor: { select: { name: true } } }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take, skip }), o)
    return { total: data.total, summary: {}, hint: "Original values, replacements, reasons and the person making each change are retained. All locations also includes global staff/account administration.", rows: data.records.map(a => ({ Location: a.locationId ? o.locationNames.get(a.locationId) || "" : "Global", "Changed (IST)": formatRangeTime(a.createdAt), Actor: a.actor.name, Action: a.action, "Record ID": a.entityId, Reason: a.reason || "", Before: a.before ? JSON.stringify(a.before) : "", After: a.after ? JSON.stringify(a.after) : "" })) }
}

export async function reports(request: NextRequest, actor: RangeActor) {
    ownerOnly(actor)
    const locations = await reportScope(request, actor), options = readOptions(request), scope = locations.map(l => l.name).join(", "), opts: Options = { ...options, ids: locations.map(l => l.id), locationNames: new Map(locations.map(l => [l.id, l.name])), allLocations: request.nextUrl.searchParams.get("locationId") === "all" }
    const result = await prisma.$transaction(tx => queryReport(tx, opts), { isolationLevel: "RepeatableRead", timeout: 30000 })
    const data: ReportResult = { report: options.type, title: reportLabels[options.type], from: options.from, to: options.to, scope, page: options.page, pageSize: 50, ...result }
    if (!options.exporting) return Response.json(data)
    const workbook = XLSX.utils.book_new(), sheet = result.rows.length ? XLSX.utils.json_to_sheet(result.rows) : XLSX.utils.aoa_to_sheet([["No matching records"]])
    if (result.rows.length) {
        const columns = Object.keys(result.rows[0])
        sheet["!cols"] = columns.map(c => ({ wch: ["Before", "After", "Description", "Payment parts", "Details"].includes(c) ? 55 : 24 }))
        sheet["!autofilter"] = { ref: sheet["!ref"]! }
        for (let row = 1; row <= result.rows.length; row++) columns.forEach((column, index) => { if (column.includes("₹")) { const cell = sheet[XLSX.utils.encode_cell({ r: row, c: index })]; if (cell) cell.z = '#,##0.00' } })
    }
    XLSX.utils.book_append_sheet(workbook, sheet, "Records")
    const summary: (string | number)[][] = [["Salvo range report", data.title], ["Locations", scope], ["From (India date)", data.from], ["Through (India date)", data.to], ["Records matching filters", data.total], ["Notes", data.hint]]
    Object.entries(result.summary).forEach(([key, value]) => { const meta = summaryLabels[key]; summary.push([meta?.label || key, meta?.money ? value / 100 : value]) })
    summary.push(["Filters", [...request.nextUrl.searchParams.entries()].filter(([key]) => !["export", "page"].includes(key)).map(([key, value]) => `${key}=${value}`).join("; ")])
    const summarySheet = XLSX.utils.aoa_to_sheet(summary); summarySheet["!cols"] = [{ wch: 32 }, { wch: 100 }]
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary")
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer", compression: true }) as Buffer
    if (buffer.byteLength > 4000000) throw new RangeError("The Excel export is too large. Narrow the filters and try again.", 413)
    return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="salvo-${options.type}-${options.from}-${options.to}.xlsx"` } })
}
