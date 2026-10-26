import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { digest } from "./auth"
import { RangeActor, RangeError, dateField, rangeDay, textField } from "./shared"
import { audit, jsonBody, locationAccess, ownerOnly, transaction } from "./server"
import { financeInclude, normalizeFinance, postFinance, readFinanceBody } from "./finance"
import { feeMonths } from "./fee-period"
import { removeAttendancePhoto, uploadReceipt } from "./media"

export async function feeList(request: NextRequest, actor: RangeActor) {
    const locationId = textField(request.nextUrl.searchParams.get("locationId"), "Location")
    await locationAccess(actor, locationId)
    const id = request.nextUrl.searchParams.get("id")
    const fees = await prisma.rangeStudentFee.findMany({ where: { ...(id ? { transactionId: id } : {}), transaction: { locationId, ...(actor.role === "owner" ? {} : { recordedById: actor.id }) } }, include: { enrollment: { include: { profile: true } }, transaction: { include: financeInclude } }, orderBy: { transaction: { createdAt: "desc" } }, take: 500 })
    return Response.json({ fees: fees.map(({ transaction: { receiptId, ...entry }, ...fee }) => ({ ...fee, transaction: { ...entry, hasReceipt: Boolean(receiptId) } })) })
}
export async function feePost(request: NextRequest, actor: RangeActor, correcting = false) {
    if (correcting) ownerOnly(actor)
    const { body, file } = await readFinanceBody(request), locationId = textField(body.locationId, "Location"), enrollmentId = textField(body.enrollmentId, "Student"), type = textField(body.type, "Admission or renewal"), months = feeMonths(body.months), coverageStart = dateField(body.coverageStart), coverageEnd = dateField(body.coverageEnd)
    await locationAccess(actor, locationId)
    if (!["admission", "renewal"].includes(type) || coverageEnd < coverageStart) throw new RangeError("Choose admission or renewal and valid coverage dates.")
    const notes = body.notes ? textField(body.notes, "Notes", 1000) : null
    const enrollment = await prisma.rangeEnrollment.findUnique({ where: { id: enrollmentId }, include: { profile: true } })
    if (!enrollment || enrollment.locationId !== locationId || (!enrollment.active && actor.role !== "owner")) throw new RangeError("Select a student enrolled at this location.", 404)
    const fee = { enrollmentId, type, months, coverageStart, coverageEnd, notes }
    const data = normalizeFinance({ ...body, kind: "income", productId: undefined, description: `${type === "admission" ? "Admission" : "Renewal"}: ${enrollment.profile.name}${notes ? ` — ${notes}` : ""}`.slice(0, 1000) })
    if (actor.role !== "owner" && data.occurredOn !== rangeDay()) throw new RangeError("Only the owner may backdate payments.", 403)
    const key = textField(body.submissionKey, "Submission key", 100), hash = digest(JSON.stringify({ data, fee, correcting: correcting ? body.id : null, file: file ? digest(Buffer.from(await file.arrayBuffer()).toString("base64")) : null }))
    const replay = await prisma.rangeFinanceTransaction.findUnique({ where: { submissionKey: key } })
    if (replay) {
        if (replay.createdById !== actor.id || replay.submissionHash !== hash) throw new RangeError("Submission key already used.", 409)
        return Response.json({ ok: true, transactionId: replay.id })
    }
    const receiptId = file ? await uploadReceipt(file, locationId) : null
    let keep = false
    try {
        const result = await transaction(async tx => {
            const currentEnrollment = await tx.rangeEnrollment.findUnique({ where: { id: enrollmentId } })
            if (!currentEnrollment || currentEnrollment.locationId !== locationId || (!currentEnrollment.active && actor.role !== "owner")) throw new RangeError("Student enrollment changed. Refresh first.", 409)
            const before = correcting ? await tx.rangeFinanceTransaction.findUnique({ where: { id: textField(body.id, "Original payment") }, include: { studentFee: true, movements: true } }) : null
            if (correcting && (!before?.studentFee || before.locationId !== locationId || before.source !== "studentFee" || before.status !== "posted" || before.version !== body.version)) throw new RangeError("Payment changed. Refresh before correcting.", 409)
            if (before && await tx.rangeFinanceTransaction.count({ where: { refundOfId: before.id, status: "posted" } })) throw new RangeError("Resolve associated refunds first.")
            if (before) {
                await tx.rangeFinanceTransaction.update({ where: { id: before.id }, data: { status: "void", version: { increment: 1 } } })
                await audit(tx, actor, "fee.voided", before.id, before, { status: "void" }, locationId, textField(body.reason, "Correction reason", 1000))
            }
            const entry = await postFinance(tx, actor, data, { submissionKey: key, submissionHash: hash, receiptId: receiptId || before?.receiptId, source: "studentFee", recordedById: before?.recordedById, correctsId: before?.id })
            const savedFee = await tx.rangeStudentFee.create({ data: { ...fee, transactionId: entry.id } })
            await audit(tx, actor, "fee.recorded", entry.id, undefined, savedFee, locationId)
            if (body.requestId) {
                const c = await tx.rangeCorrection.findUnique({ where: { id: String(body.requestId) } })
                if (!c || c.kind !== "studentFee" || c.entityId !== before?.id || c.locationId !== locationId || c.status !== "pending") throw new RangeError("Correction request does not match this payment.", 409)
                await tx.rangeCorrection.update({ where: { id: c.id }, data: { status: "resolved", resolution: String(body.reason), resolvedAt: new Date(), resolvedById: actor.id } })
            }
            return entry
        })
        keep = true
        return Response.json({ ok: true, transactionId: result.id })
    } finally { if (!keep && receiptId) await removeAttendancePhoto(receiptId) }
}
export async function feeVoid(request: NextRequest, actor: RangeActor) {
    ownerOnly(actor)
    const body = await jsonBody(request), id = textField(body.id, "Payment"), reason = textField(body.reason, "Reason", 1000)
    return Response.json(await transaction(async tx => {
        const before = await tx.rangeFinanceTransaction.findUnique({ where: { id }, include: { studentFee: true, movements: true } })
        if (!before?.studentFee || before.source !== "studentFee" || before.status !== "posted" || before.version !== body.version) throw new RangeError("Payment changed. Refresh first.", 409)
        await locationAccess(actor, before.locationId, tx)
        if (await tx.rangeFinanceTransaction.count({ where: { refundOfId: id, status: "posted" } })) throw new RangeError("Resolve associated refunds first.")
        await tx.rangeFinanceTransaction.update({ where: { id }, data: { status: "void", version: { increment: 1 } } })
        if (body.requestId) {
            const c = await tx.rangeCorrection.findUnique({ where: { id: String(body.requestId) } })
            if (!c || c.kind !== "studentFee" || c.entityId !== id || c.status !== "pending") throw new RangeError("Correction request does not match this payment.", 409)
            await tx.rangeCorrection.update({ where: { id: c.id }, data: { status: "resolved", resolution: reason, resolvedAt: new Date(), resolvedById: actor.id } })
        }
        await audit(tx, actor, "fee.voided", id, before, { status: "void" }, before.locationId, reason)
        return { ok: true }
    }))
}
