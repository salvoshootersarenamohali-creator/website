import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { RangeActor, rangeDay } from "./shared"
import { accountBalances } from "./finance"
import { reportDates, reportScope } from "./report-scope"

export async function dashboard(request: NextRequest, actor: RangeActor) {
    const locations = await reportScope(request, actor), ids = locations.map(l => l.id), owner = actor.role === "owner", { from, to } = reportDates(request), today = rangeDay()
    const [totals, enrollments, shifts, pendingTransfers, pendingCorrections, accountRows] = await Promise.all([
        prisma.rangeFinanceTransaction.groupBy({ by: ["kind"], where: { locationId: { in: ids }, status: "posted", occurredOn: { gte: from, lte: to }, ...(owner ? {} : { recordedById: actor.id }) }, _sum: { amountPaise: true } }),
        prisma.rangeEnrollment.findMany({ where: { locationId: { in: ids }, active: true, startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] }, select: { attendance: { where: { date: today }, select: { status: true } } } }),
        prisma.rangeShift.findMany({ where: { locationId: { in: ids }, outAt: null, ...(owner ? {} : { userId: actor.id }) }, select: { id: true, locationId: true, inAt: true, user: { select: { name: true } }, location: { select: { name: true } } }, orderBy: { inAt: "asc" } }),
        prisma.rangeTransfer.count({ where: { locationId: { in: ids }, status: "pending", ...(owner ? {} : { requestedById: actor.id }) } }),
        prisma.rangeCorrection.count({ where: { locationId: { in: ids }, status: "pending", ...(owner ? {} : { userId: actor.id }) } }),
        prisma.rangeMoneyAccount.findMany({ where: { locationId: { in: ids }, ...(owner ? {} : { coachId: actor.id }) }, select: { id: true, name: true, locationId: true, active: true } }),
    ])
    const balances = await Promise.all(locations.map(async l => ({ locationId: l.id, balances: await accountBalances(l.id, to) })))
    const accounts = accountRows.map(a => ({ ...a, location: locations.find(l => l.id === a.locationId)?.name || "", balancePaise: balances.find(b => b.locationId === a.locationId)?.balances.get(a.id) || 0 }))
    const attendance: Record<string, number> = { present: 0, absent: 0, leave: 0, unmarked: 0 }
    enrollments.forEach(e => { const status = e.attendance[0]?.status || "unmarked"; attendance[status] = (attendance[status] || 0) + 1 })
    const incomePaise = totals.find(t => t.kind === "income")?._sum.amountPaise || 0, expensePaise = totals.find(t => t.kind === "expense")?._sum.amountPaise || 0
    return Response.json({ from, to, today, scope: locations.map(l => l.name).join(", "), incomePaise, expensePaise, netPaise: incomePaise - expensePaise, attendance, openShifts: shifts.map(s => ({ ...s, needsReview: rangeDay(s.inAt) < today })), pendingTransfers, pendingCorrections, accounts, totalBalancePaise: accounts.reduce((sum, a) => sum + a.balancePaise, 0) })
}
