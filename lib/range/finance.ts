import { Prisma } from "@prisma/client"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { digest } from "./auth"
import { RangeActor, RangeError, dateField, rangeDay, textField } from "./shared"
import { audit, jsonBody, locationAccess, ownerOnly, transaction } from "./server"
import { paise } from "./money"
import { attendancePhotoUrl, removeAttendancePhoto, uploadReceipt } from "./media"

export const financeInclude = { movements: { include: { account: { select: { id: true, name: true, custodian: true, coachId: true, channel: true } } } }, recordedBy: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } } as const
export async function accountBalances(locationId: string, through = rangeDay()) {
    const rows = await prisma.$queryRaw<{ id: string; balance: bigint }[]>(Prisma.sql`SELECT a.id, a."openingPaise"::bigint + COALESCE(SUM(CASE WHEN t.status = 'posted' AND t."occurredOn" >= a."openingDate" AND t."occurredOn" <= ${through} THEN m."amountPaise" ELSE 0 END), 0)::bigint AS balance FROM "RangeMoneyAccount" a LEFT JOIN "RangeMoneyMovement" m ON m."accountId" = a.id LEFT JOIN "RangeFinanceTransaction" t ON t.id = m."transactionId" WHERE a."locationId" = ${locationId} AND a."openingDate" <= ${through} GROUP BY a.id`)
    return new Map(rows.map(r => [r.id, Number(r.balance)]))
}
export async function financeMeta(request: NextRequest, actor: RangeActor) {
    const locationId = textField(request.nextUrl.searchParams.get("locationId"), "Location")
    await locationAccess(actor, locationId)
    const owner = actor.role === "owner"
    const accounts = await prisma.rangeMoneyAccount.findMany({ where: { locationId, ...(owner ? {} : { active: true, OR: [{ coachId: actor.id }, { custodian: { in: ["kartik", "salvo"] } }] }) }, orderBy: { name: "asc" } })
    const balances = await accountBalances(locationId)
    return Response.json({ accounts: accounts.map(({ openingPaise, openingDate, ...account }) => ({ ...account, ...(owner ? { openingPaise, openingDate } : {}), ...(owner || account.coachId === actor.id ? { balancePaise: balances.get(account.id) || 0 } : {}) })), products: await prisma.rangeProduct.findMany({ where: { locationId, ...(owner ? {} : { active: true }) }, orderBy: { name: "asc" } }), categories: await prisma.rangeFinanceCategory.findMany({ where: { locationId, kind: { in: ["income", "expense"] }, ...(owner ? {} : { active: true }) }, orderBy: { name: "asc" } }) })
}
export async function financeSettings(request: NextRequest, actor: RangeActor) {
    ownerOnly(actor)
    const body = await jsonBody(request), locationId = textField(body.locationId, "Location"), name = textField(body.name, "Name", 100), id = typeof body.id === "string" ? body.id : undefined
    await locationAccess(actor, locationId)
    const reason = id ? textField(body.reason, "Reason for change", 1000) : undefined
    if (id && typeof body.active !== "boolean") throw new RangeError("Select an active status.")
    return Response.json(await transaction(async tx => {
        if (body.type === "account") {
            const custodian = textField(body.custodian, "Holder"), channel = textField(body.channel, "Cash or online")
            if (!["coach", "kartik", "salvo"].includes(custodian) || !["cash", "online"].includes(channel)) throw new RangeError("Select a valid holder and payment channel.")
            const coachId = custodian === "coach" ? textField(body.coachId, "Coach") : null
            if (coachId) {
                const coach = await tx.rangeUser.findUnique({ where: { id: coachId } })
                if (coach?.role !== "coach" || !await tx.rangeMembership.findUnique({ where: { userId_locationId: { userId: coachId, locationId } } })) throw new RangeError("Choose a coach assigned to this location.")
            }
            const before = id ? await tx.rangeMoneyAccount.findUnique({ where: { id } }) : null
            if (id && (!before || before.locationId !== locationId)) throw new RangeError("Account not found.", 404)
            if (before && before.version !== body.version) throw new RangeError("Account changed. Refresh first.", 409)
            if (before && (before.coachId !== coachId || before.custodian !== custodian || before.channel !== channel)) throw new RangeError("An account’s holder and channel cannot change. Create a new account instead.")
            const openingDate = dateField(body.openingDate, "Opening balance date")
            if (openingDate > rangeDay()) throw new RangeError("Opening balance date cannot be in the future.")
            const data = { name, custodian, coachId, channel, openingPaise: paise(body.openingPaise, true, true), openingDate, active: id ? body.active as boolean : true }
            const account = before ? await tx.rangeMoneyAccount.update({ where: { id }, data: { ...data, version: { increment: 1 } } }) : await tx.rangeMoneyAccount.create({ data: { ...data, locationId } })
            await audit(tx, actor, "finance.account.saved", account.id, before || undefined, account, locationId, reason)
        } else if (body.type === "product") {
            const before = id ? await tx.rangeProduct.findUnique({ where: { id } }) : null
            if (id && (!before || before.locationId !== locationId)) throw new RangeError("Product not found.", 404)
            if (before && before.version !== body.version) throw new RangeError("Product changed. Refresh first.", 409)
            const data = { name, unit: textField(body.unit, "Unit", 40), defaultPricePaise: paise(body.defaultPricePaise, true), active: id ? body.active as boolean : true }
            const product = before ? await tx.rangeProduct.update({ where: { id }, data: { ...data, version: { increment: 1 } } }) : await tx.rangeProduct.create({ data: { ...data, locationId } })
            await audit(tx, actor, "finance.product.saved", product.id, before || undefined, product, locationId, reason)
        } else if (body.type === "category") {
            if (!["income", "expense"].includes(String(body.kind))) throw new RangeError("Select income or expense.")
            const before = id ? await tx.rangeFinanceCategory.findUnique({ where: { id } }) : null
            if (id && (!before || before.locationId !== locationId)) throw new RangeError("Category not found.", 404)
            if (before && (before.version !== body.version || before.kind !== body.kind)) throw new RangeError("Category changed or its type cannot be changed.", 409)
            const data = { name, kind: String(body.kind), active: id ? body.active as boolean : true }
            const category = before ? await tx.rangeFinanceCategory.update({ where: { id }, data: { ...data, version: { increment: 1 } } }) : await tx.rangeFinanceCategory.create({ data: { ...data, locationId } })
            await audit(tx, actor, "finance.category.saved", category.id, before || undefined, category, locationId, reason)
        } else throw new RangeError("Invalid settings action.")
        return { ok: true }
    }))
}
export function normalizeFinance(body: Record<string, unknown>) {
    const locationId = textField(body.locationId, "Location"), kind = textField(body.kind, "Income or expense"), amountPaise = paise(body.amountPaise), occurredOn = dateField(body.occurredOn), description = textField(body.description, "Description", 1000), categoryId = textField(body.categoryId, "Category")
    if (!["income", "expense"].includes(kind) || occurredOn > rangeDay()) throw new RangeError("Choose income or expense and a date that is not in the future.")
    if (!Array.isArray(body.payments) || !body.payments.length || body.payments.length > 20) throw new RangeError("Add between 1 and 20 payment parts.")
    const payments = body.payments.map(p => {
        if (!p || typeof p !== "object") throw new RangeError("Invalid payment part.")
        const method = textField(p.method, "Payment method")
        if (!["cash", "online"].includes(method)) throw new RangeError("Choose cash or online.")
        return { accountId: textField(p.accountId, "Payment account"), amountPaise: paise(p.amountPaise), method, reference: p.reference ? textField(p.reference, "Payment reference", 100) : null }
    })
    if (payments.reduce((sum, p) => sum + p.amountPaise, 0) !== amountPaise) throw new RangeError("Payment parts must add up to the total amount.")
    const productId = body.productId ? textField(body.productId, "Product") : null
    const quantity = productId ? paise(body.quantity) : null, unitPricePaise = productId ? paise(body.unitPricePaise) : null
    if (quantity && (quantity > 100000 || quantity * unitPricePaise! !== amountPaise || kind !== "income")) throw new RangeError("Product quantity × unit price must equal the sale amount.")
    return { locationId, kind, amountPaise, occurredOn, description, categoryId, payments, productId, quantity, unitPricePaise }
}
export type FinanceInput = ReturnType<typeof normalizeFinance>
export async function postFinance(tx: Prisma.TransactionClient, actor: RangeActor, data: FinanceInput, options: { submissionKey: string; submissionHash: string; receiptId?: string | null; correctsId?: string; recordedById?: string; refundOfId?: string; source?: string }) {
    await locationAccess(actor, data.locationId, tx)
    const category = await tx.rangeFinanceCategory.findUnique({ where: { id: data.categoryId } })
    if (!category?.active || category.locationId !== data.locationId || category.kind !== data.kind) throw new RangeError("Select an active category matching this location and transaction type.")
    const product = data.productId ? await tx.rangeProduct.findUnique({ where: { id: data.productId } }) : null
    if (data.productId && (!product?.active || product.locationId !== data.locationId)) throw new RangeError("Product not available at this location.")
    for (const payment of data.payments) {
        const account = await tx.rangeMoneyAccount.findUnique({ where: { id: payment.accountId } })
        if (!account?.active || account.locationId !== data.locationId || account.channel !== payment.method || (actor.role !== "owner" && account.custodian === "coach" && account.coachId !== actor.id)) throw new RangeError("Payment account is not available to you for this location or method.", 403)
    }
    const { payments, ...fields } = data
    const record = await tx.rangeFinanceTransaction.create({ data: { ...fields, ...options, createdById: actor.id, recordedById: options.recordedById || actor.id, categoryName: category.name, productName: product?.name, source: options.source || (product ? "sale" : "manual"), movements: { create: payments.map(p => ({ ...p, amountPaise: p.amountPaise * (data.kind === "income" ? 1 : -1) })) } }, include: financeInclude })
    await audit(tx, actor, "finance.posted", record.id, undefined, record, data.locationId)
    return record
}
export async function readFinanceBody(request: NextRequest) {
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) return { body: await jsonBody(request), file: undefined }
    if (Number(request.headers.get("content-length")) > 3500000) throw new RangeError("Receipt is too large.", 413)
    const form = await request.formData()
    let body: Record<string, unknown>
    try { body = JSON.parse(String(form.get("payload"))) } catch { throw new RangeError("Invalid finance request.") }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new RangeError("Invalid finance request.")
    const file = form.get("receipt")
    return { body, file: file instanceof File && file.size ? file : undefined }
}
export async function financePost(request: NextRequest, actor: RangeActor, correction = false) {
    if (correction) ownerOnly(actor)
    const { body, file } = await readFinanceBody(request), data = normalizeFinance(body), key = textField(body.submissionKey, "Submission key", 100)
    await locationAccess(actor, data.locationId)
    if (actor.role !== "owner" && data.occurredOn !== rangeDay()) throw new RangeError("Only the owner can enter earlier financial activity.", 403)
    const hash = digest(JSON.stringify({ data, correctsId: correction ? body.id : null, refundOfId: body.refundOfId || null, file: file ? digest(Buffer.from(await file.arrayBuffer()).toString("base64")) : null }))
    const existing = await prisma.rangeFinanceTransaction.findUnique({ where: { submissionKey: key } })
    if (existing) {
        if (existing.createdById !== actor.id || existing.submissionHash !== hash) throw new RangeError("Submission key already used.", 409)
        return Response.json({ ok: true, transactionId: existing.id })
    }
    const receiptId = file ? await uploadReceipt(file, data.locationId) : null
    let keep = false
    try {
        const result = await transaction(async tx => {
            const before = correction ? await tx.rangeFinanceTransaction.findUnique({ where: { id: textField(body.id, "Original entry") }, include: financeInclude }) : null
            if (correction && (!before || before.locationId !== data.locationId || before.status !== "posted" || before.version !== body.version)) throw new RangeError("Original entry changed or cannot be corrected.", 409)
            if (before && !["manual", "sale", "refund"].includes(before.source)) throw new RangeError("Use the original feature to correct this entry.")
            if (before && await tx.rangeFinanceTransaction.count({ where: { refundOfId: before.id, status: "posted" } })) throw new RangeError("Correct or void associated refunds first.")
            const refundOfId = body.refundOfId ? textField(body.refundOfId, "Refunded entry") : before?.refundOfId || undefined
            if (refundOfId) {
                ownerOnly(actor)
                const original = await tx.rangeFinanceTransaction.findUnique({ where: { id: refundOfId } })
                const refunded = await tx.rangeFinanceTransaction.aggregate({ where: { refundOfId, status: "posted", ...(before ? { id: { not: before.id } } : {}) }, _sum: { amountPaise: true } })
                if (!original || original.locationId !== data.locationId || original.status !== "posted" || !["income", "expense"].includes(original.kind) || original.source === "refund" || original.kind === data.kind || data.productId || data.occurredOn < original.occurredOn || data.amountPaise + (refunded._sum.amountPaise || 0) > original.amountPaise) throw new RangeError("Refund must follow the original payment, reverse its direction and stay within its unrefunded amount.")
            }
            if (before) {
                await tx.rangeFinanceTransaction.update({ where: { id: before.id }, data: { status: "void", version: { increment: 1 } } })
                await audit(tx, actor, "finance.voided", before.id, before, { status: "void" }, data.locationId, textField(body.reason, "Correction reason", 1000))
            }
            const record = await postFinance(tx, actor, data, { submissionKey: key, submissionHash: hash, receiptId: receiptId || before?.receiptId, correctsId: before?.id, recordedById: before?.recordedById, refundOfId, source: refundOfId ? "refund" : undefined })
            if (body.requestId) {
                ownerOnly(actor)
                const c = await tx.rangeCorrection.findUnique({ where: { id: String(body.requestId) } })
                if (!c || c.kind !== "finance" || c.entityId !== before?.id || c.locationId !== data.locationId || c.status !== "pending") throw new RangeError("Correction request does not match this entry.", 409)
                await tx.rangeCorrection.update({ where: { id: c.id }, data: { status: "resolved", resolution: String(body.reason), resolvedAt: new Date(), resolvedById: actor.id } })
            }
            return record
        })
        keep = true
        return Response.json({ ok: true, transactionId: result.id })
    } finally { if (!keep && receiptId) await removeAttendancePhoto(receiptId) }
}
export async function financeVoid(request: NextRequest, actor: RangeActor) {
    ownerOnly(actor)
    const body = await jsonBody(request), id = textField(body.id, "Entry"), reason = textField(body.reason, "Reason", 1000)
    return Response.json(await transaction(async tx => {
        const before = await tx.rangeFinanceTransaction.findUnique({ where: { id }, include: financeInclude })
        if (!before || before.status !== "posted" || before.version !== body.version) throw new RangeError("Entry changed. Refresh first.", 409)
        await locationAccess(actor, before.locationId, tx)
        if (!["manual", "sale", "refund"].includes(before.source)) throw new RangeError("Use the original feature to void this entry.")
        if (await tx.rangeFinanceTransaction.count({ where: { refundOfId: id, status: "posted" } })) throw new RangeError("Void associated refunds first.")
        await tx.rangeFinanceTransaction.update({ where: { id }, data: { status: "void", version: { increment: 1 } } })
        if (body.requestId) {
            const correction = await tx.rangeCorrection.findUnique({ where: { id: String(body.requestId) } })
            if (!correction || correction.kind !== "finance" || correction.entityId !== id || correction.status !== "pending") throw new RangeError("Correction request does not match this entry.", 409)
            await tx.rangeCorrection.update({ where: { id: correction.id }, data: { status: "resolved", resolution: reason, resolvedAt: new Date(), resolvedById: actor.id } })
        }
        await audit(tx, actor, "finance.voided", id, before, { status: "void" }, before.locationId, reason)
        return { ok: true }
    }))
}
export async function financeList(request: NextRequest, actor: RangeActor) {
    const locationId = textField(request.nextUrl.searchParams.get("locationId"), "Location")
    await locationAccess(actor, locationId)
    const id = request.nextUrl.searchParams.get("id"), from = dateField(request.nextUrl.searchParams.get("from") || rangeDay(new Date(Date.now() - 30 * 86400000))), to = dateField(request.nextUrl.searchParams.get("to") || rangeDay())
    const entries = await prisma.rangeFinanceTransaction.findMany({ where: { locationId, ...(actor.role === "owner" ? {} : { recordedById: actor.id }), ...(id ? { id } : { occurredOn: { gte: from, lte: to } }) }, include: financeInclude, orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }], take: 300 })
    return Response.json({ entries: entries.map(({ receiptId, ...entry }) => ({ ...entry, hasReceipt: Boolean(receiptId) })) })
}
export async function financeReceipt(request: NextRequest, actor: RangeActor) {
    const entry = await prisma.rangeFinanceTransaction.findUnique({ where: { id: request.nextUrl.searchParams.get("id") || "" } })
    if (!entry?.receiptId || (actor.role !== "owner" && entry.recordedById !== actor.id)) throw new RangeError("Receipt not found.", 404)
    await locationAccess(actor, entry.locationId)
    return new Response(null, { status: 302, headers: { Location: attendancePhotoUrl(entry.receiptId), "Referrer-Policy": "no-referrer" } })
}
