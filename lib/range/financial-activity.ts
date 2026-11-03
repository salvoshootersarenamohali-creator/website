import type { Prisma } from "@prisma/client"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { jsonBody, masterOnly, transaction } from "./server"
import { RangeError, type RangeActor } from "./shared"

export const financialActions: Prisma.RangeAuditWhereInput = { OR: [
    ...["finance.", "fee.", "salary.", "transfer."].map(prefix => ({ action: { startsWith: prefix } })),
    { action: { in: ["correction.requested", "correction.rejected"] }, OR: ["finance", "studentFee", "transfer"].map(kind => ({ after: { path: ["kind"], equals: kind } })) },
] }
export async function financialActivity(request: NextRequest, actor: RangeActor) {
    masterOnly(actor)
    const master = await prisma.rangeUser.findUniqueOrThrow({ where: { id: actor.id }, select: { financeNotificationSince: true, createdAt: true } })
    const base: Prisma.RangeAuditWhereInput = { AND: [financialActions, { createdAt: { gte: master.financeNotificationSince || master.createdAt } }] }
    if (request.method === "POST") {
        const body = await jsonBody(request)
        if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 50 || body.ids.some(id => typeof id !== "string" || id.length > 100)) throw new RangeError("Choose up to 50 displayed updates.")
        const ids = [...new Set(body.ids as string[])]
        await transaction(async tx => {
            const allowed = await tx.rangeAudit.count({ where: { AND: [base, { id: { in: ids } }] } })
            if (allowed !== ids.length) throw new RangeError("Refresh the financial updates before marking them read.", 409)
            await tx.rangeFinanceNotificationRead.createMany({ data: ids.map(auditId => ({ userId: actor.id, auditId })), skipDuplicates: true })
        })
        return Response.json({ ok: true })
    }
    const unread = { AND: [base, { financeNotificationReads: { none: { userId: actor.id } } }] } satisfies Prisma.RangeAuditWhereInput
    const unreadCount = await prisma.rangeAudit.count({ where: unread })
    if (request.nextUrl.searchParams.get("countOnly") === "1") return Response.json({ unreadCount })
    const page = Number(request.nextUrl.searchParams.get("page") || "1")
    if (!Number.isInteger(page) || page < 1 || page > 10000) throw new RangeError("Invalid page.")
    const where = request.nextUrl.searchParams.get("all") === "1" ? base : unread
    const [total, updates] = await prisma.$transaction([
        prisma.rangeAudit.count({ where }),
        prisma.rangeAudit.findMany({ where, include: { actor: { select: { name: true } }, location: { select: { name: true } }, financeNotificationReads: { where: { userId: actor.id }, select: { readAt: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50, skip: (page - 1) * 50 }),
    ])
    return Response.json({ unreadCount, total, page, updates: updates.map(({ financeNotificationReads, ...update }) => ({ ...update, read: financeNotificationReads.length > 0 })) })
}
