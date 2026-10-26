import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { digest } from "./auth"
import { RangeActor, RangeError, dateField, textField } from "./shared"
import { audit, jsonBody, locationAccess, ownerOnly, transaction } from "./server"
import { financeInclude, normalizeFinance, postFinance, readFinanceBody } from "./finance"
import { removeAttendancePhoto, uploadReceipt } from "./media"

function salaryMonth(value: unknown) {
    const month = textField(value, "Salary month", 7)
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new RangeError("Select a valid salary month and year.")
    dateField(`${month}-01`)
    return month
}
export async function salaryList(request: NextRequest, actor: RangeActor) {
    ownerOnly(actor)
    const locationId = textField(request.nextUrl.searchParams.get("locationId"), "Location"), month = request.nextUrl.searchParams.get("month")
    await locationAccess(actor, locationId)
    const salaries = await prisma.rangeSalaryPayment.findMany({ where: { ...(month ? { salaryMonth: salaryMonth(month) } : {}), transaction: { locationId } }, include: { coach: { select: { id: true, name: true, active: true } }, transaction: { include: financeInclude } }, orderBy: [{ salaryMonth: "desc" }, { transaction: { createdAt: "desc" } }], take: 500 })
    return Response.json({ salaries: salaries.map(({ transaction: { receiptId, ...entry }, ...salary }) => ({ ...salary, transaction: { ...entry, hasReceipt: Boolean(receiptId) } })) })
}
export async function salaryPost(request: NextRequest, actor: RangeActor, correcting = false) {
    ownerOnly(actor)
    const { body, file } = await readFinanceBody(request), locationId = textField(body.locationId, "Location"), coachId = textField(body.coachId, "Coach"), month = salaryMonth(body.salaryMonth), notes = body.notes ? textField(body.notes, "Notes", 1000) : null
    await locationAccess(actor, locationId)
    const coach = await prisma.rangeUser.findUnique({ where: { id: coachId } })
    if (coach?.role !== "coach") throw new RangeError("Select a coach account.")
    const data = normalizeFinance({ ...body, kind: "expense", productId: undefined, categoryId: "salary", description: `Salary: ${coach.name} — ${month}${notes ? ` — ${notes}` : ""}`.slice(0, 1000) })
    const detail = { coachId, salaryMonth: month, notes }, key = textField(body.submissionKey, "Submission key", 100), hash = digest(JSON.stringify({ data, detail, correcting: correcting ? body.id : null, file: file ? digest(Buffer.from(await file.arrayBuffer()).toString("base64")) : null }))
    const replay = await prisma.rangeFinanceTransaction.findUnique({ where: { submissionKey: key } })
    if (replay) {
        if (replay.createdById !== actor.id || replay.submissionHash !== hash) throw new RangeError("Submission key already used.", 409)
        return Response.json({ ok: true, transactionId: replay.id })
    }
    const receiptId = file ? await uploadReceipt(file, locationId) : null
    let keep = false
    try {
        const result = await transaction(async tx => {
            const currentCoach = await tx.rangeUser.findUnique({ where: { id: coachId } })
            if (currentCoach?.role !== "coach") throw new RangeError("Coach account changed. Refresh first.", 409)
            const category = await tx.rangeFinanceCategory.upsert({ where: { locationId_name_kind: { locationId, name: "Coach salaries", kind: "expense" } }, create: { locationId, name: "Coach salaries", kind: "expense" }, update: {} })
            const before = correcting ? await tx.rangeFinanceTransaction.findUnique({ where: { id: textField(body.id, "Original salary payment") }, include: { salaryPayment: true, movements: true } }) : null
            if (correcting && (!before?.salaryPayment || before.locationId !== locationId || before.source !== "salary" || before.status !== "posted" || before.version !== body.version)) throw new RangeError("Salary payment changed. Refresh before correcting.", 409)
            if (before && await tx.rangeFinanceTransaction.count({ where: { refundOfId: before.id, status: "posted" } })) throw new RangeError("Resolve associated returned payments first.")
            if (before) {
                await tx.rangeFinanceTransaction.update({ where: { id: before.id }, data: { status: "void", version: { increment: 1 } } })
                await audit(tx, actor, "salary.voided", before.id, before, { status: "void" }, locationId, textField(body.reason, "Correction reason", 1000))
            }
            const entry = await postFinance(tx, actor, { ...data, categoryId: category.id }, { submissionKey: key, submissionHash: hash, receiptId: receiptId || before?.receiptId, source: "salary", recordedById: before?.recordedById, correctsId: before?.id })
            const salary = await tx.rangeSalaryPayment.create({ data: { ...detail, transactionId: entry.id } })
            await audit(tx, actor, "salary.recorded", entry.id, undefined, salary, locationId)
            return entry
        })
        keep = true
        return Response.json({ ok: true, transactionId: result.id })
    } finally { if (!keep && receiptId) await removeAttendancePhoto(receiptId) }
}
export async function salaryVoid(request: NextRequest, actor: RangeActor) {
    ownerOnly(actor)
    const body = await jsonBody(request), id = textField(body.id, "Salary payment"), reason = textField(body.reason, "Reason", 1000)
    return Response.json(await transaction(async tx => {
        const before = await tx.rangeFinanceTransaction.findUnique({ where: { id }, include: { salaryPayment: true, movements: true } })
        if (!before?.salaryPayment || before.source !== "salary" || before.status !== "posted" || before.version !== body.version) throw new RangeError("Salary payment changed. Refresh first.", 409)
        await locationAccess(actor, before.locationId, tx)
        if (await tx.rangeFinanceTransaction.count({ where: { refundOfId: id, status: "posted" } })) throw new RangeError("Resolve associated returned payments first.")
        await tx.rangeFinanceTransaction.update({ where: { id }, data: { status: "void", version: { increment: 1 } } })
        await audit(tx, actor, "salary.voided", id, before, { status: "void" }, before.locationId, reason)
        return { ok: true }
    }))
}
