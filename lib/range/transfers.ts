import { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { digest } from "./auth"
import { RangeActor, RangeError, dateField, rangeDay, textField } from "./shared"
import { audit, jsonBody, locationAccess, ownerOnly, transaction } from "./server"
import { paise } from "./money"

const transferInclude = { requestedBy: { select: { name: true } }, fromAccount: { select: { name: true } }, toAccount: { select: { name: true } } } as const
export async function transferList(request: NextRequest, actor: RangeActor) {
    const locationId = textField(request.nextUrl.searchParams.get("locationId"), "Location"), id = request.nextUrl.searchParams.get("id")
    await locationAccess(actor, locationId)
    const transfers = await prisma.rangeTransfer.findMany({ where: { locationId, ...(id ? { id } : {}), ...(actor.role === "owner" ? {} : { OR: [{ requestedById: actor.id }, { fromAccount: { coachId: actor.id } }, { toAccount: { coachId: actor.id } }] }) }, include: transferInclude, orderBy: { createdAt: "desc" }, take: 500 })
    return Response.json({ transfers })
}
async function confirmTransfer(tx: Prisma.TransactionClient, actor: RangeActor, before: NonNullable<Awaited<ReturnType<typeof prisma.rangeTransfer.findUnique>>>, reason: string) {
    const accounts = await tx.rangeMoneyAccount.findMany({ where: { id: { in: [before.fromAccountId, before.toAccountId] }, locationId: before.locationId, active: true } })
    if (accounts.length !== 2) throw new RangeError("Transfer accounts changed. Reactivate them or reject this request.")
    const category = await tx.rangeFinanceCategory.upsert({ where: { locationId_name_kind: { locationId: before.locationId, name: "Transfers", kind: "transfer" } }, create: { locationId: before.locationId, name: "Transfers", kind: "transfer" }, update: {} })
    const record = await tx.rangeFinanceTransaction.create({ data: { locationId: before.locationId, createdById: actor.id, recordedById: before.requestedById, kind: "transfer", source: "transfer", categoryId: category.id, categoryName: "Transfers", amountPaise: before.amountPaise, occurredOn: before.occurredOn, description: before.notes, submissionKey: `transfer:${before.id}`, submissionHash: digest(before.id), movements: { create: [{ accountId: before.fromAccountId, amountPaise: -before.amountPaise, method: accounts.find(a => a.id === before.fromAccountId)!.channel, reference: before.reference }, { accountId: before.toAccountId, amountPaise: before.amountPaise, method: accounts.find(a => a.id === before.toAccountId)!.channel, reference: before.reference }] } } })
    const after = await tx.rangeTransfer.update({ where: { id: before.id }, data: { transactionId: record.id, status: "confirmed", resolvedById: actor.id, resolvedAt: new Date(), resolution: reason, version: { increment: 1 } } })
    await audit(tx, actor, "transfer.confirmed", before.id, before, after, before.locationId, reason)
    return after
}
export async function transferPost(request: NextRequest, actor: RangeActor) {
    const body = await jsonBody(request), locationId = textField(body.locationId, "Location"), fromAccountId = textField(body.fromAccountId, "Source account"), toAccountId = textField(body.toAccountId, "Receiving account"), amountPaise = paise(body.amountPaise), occurredOn = dateField(body.occurredOn), notes = textField(body.notes, "Handover details", 1000), key = textField(body.submissionKey, "Submission key", 100), reference = body.reference ? textField(body.reference, "Reference", 100) : null
    await locationAccess(actor, locationId)
    if (fromAccountId === toAccountId || occurredOn > rangeDay()) throw new RangeError("Choose different accounts and a date that is not in the future.")
    if (body.confirmNow !== undefined && typeof body.confirmNow !== "boolean") throw new RangeError("Invalid confirmation choice.")
    if (actor.role !== "owner" && (occurredOn !== rangeDay() || body.confirmNow)) throw new RangeError("Owner confirmation is required; coaches can submit today's handovers.", 403)
    const hash = digest(JSON.stringify({ locationId, fromAccountId, toAccountId, amountPaise, occurredOn, notes, reference, confirmNow: Boolean(body.confirmNow) }))
    return Response.json(await transaction(async tx => {
        const replay = await tx.rangeTransfer.findUnique({ where: { submissionKey: key } })
        if (replay) {
            if (replay.requestedById !== actor.id || replay.submissionHash !== hash) throw new RangeError("Submission key already used.", 409)
            return { ok: true, transferId: replay.id }
        }
        const from = await tx.rangeMoneyAccount.findUnique({ where: { id: fromAccountId } }), to = await tx.rangeMoneyAccount.findUnique({ where: { id: toAccountId } })
        if (!from?.active || !to?.active || from.locationId !== locationId || to.locationId !== locationId || (actor.role !== "owner" && (from.custodian !== "coach" || from.coachId !== actor.id || (to.custodian === "coach" && to.coachId !== actor.id)))) throw new RangeError("You can hand over funds from your own account to an available account at this location.", 403)
        const transfer = await tx.rangeTransfer.create({ data: { locationId, requestedById: actor.id, fromAccountId, toAccountId, amountPaise, occurredOn, notes, reference, submissionKey: key, submissionHash: hash } })
        await audit(tx, actor, "transfer.requested", transfer.id, undefined, transfer, locationId)
        if (body.confirmNow && actor.role === "owner") await confirmTransfer(tx, actor, transfer, textField(body.reason, "Confirmation note", 1000))
        return { ok: true, transferId: transfer.id }
    }))
}
export async function transferResolve(request: NextRequest, actor: RangeActor) {
    ownerOnly(actor)
    const body = await jsonBody(request), id = textField(body.id, "Transfer"), reason = textField(body.reason, "Owner note", 1000), action = textField(body.action, "Action")
    return Response.json(await transaction(async tx => {
        const before = await tx.rangeTransfer.findUnique({ where: { id } })
        if (!before || before.version !== body.version) throw new RangeError("Transfer changed. Refresh before continuing.", 409)
        await locationAccess(actor, before.locationId, tx)
        if (action === "confirm" && before.status === "pending") await confirmTransfer(tx, actor, before, reason)
        else if (action === "reject" && before.status === "pending") {
            const after = await tx.rangeTransfer.update({ where: { id }, data: { status: "rejected", resolution: reason, resolvedById: actor.id, resolvedAt: new Date(), version: { increment: 1 } } })
            await audit(tx, actor, "transfer.rejected", id, before, after, before.locationId, reason)
        } else if (action === "reverse" && before.status === "confirmed" && before.transactionId) {
            const entry = await tx.rangeFinanceTransaction.findUniqueOrThrow({ where: { id: before.transactionId } })
            await tx.rangeFinanceTransaction.update({ where: { id: entry.id }, data: { status: "void", version: { increment: 1 } } })
            const after = await tx.rangeTransfer.update({ where: { id }, data: { status: "reversed", resolution: reason, resolvedById: actor.id, resolvedAt: new Date(), version: { increment: 1 } } })
            await audit(tx, actor, "transfer.reversed", id, { ...before, transaction: entry }, after, before.locationId, reason)
        } else throw new RangeError("This action is not available for the transfer's current status.", 409)
        if (body.requestId) {
            const c = await tx.rangeCorrection.findUnique({ where: { id: String(body.requestId) } })
            if (!c || c.kind !== "transfer" || c.entityId !== id || c.status !== "pending") throw new RangeError("Correction request does not match this transfer.", 409)
            await tx.rangeCorrection.update({ where: { id: c.id }, data: { status: "resolved", resolution: reason, resolvedAt: new Date(), resolvedById: actor.id } })
        }
        return { ok: true }
    }))
}
