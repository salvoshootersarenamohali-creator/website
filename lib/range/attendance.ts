import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { RangeActor, RangeError, dateWindow, indiaTime, rangeDay, textField } from "./shared"
import { audit, jsonBody, locationAccess, ownerOnly, transaction } from "./server"
import { attendancePhotoUrl, removeAttendancePhoto, uploadAttendancePhoto } from "./media"

const shiftSelect = { id: true, userId: true, locationId: true, inAt: true, outAt: true, originalInAt: true, originalOutAt: true, adjusted: true, version: true, user: { select: { id: true, name: true } } } as const
export async function attendanceList(request: NextRequest, actor: RangeActor) {
    const locationId = textField(request.nextUrl.searchParams.get("locationId"), "Location")
    await locationAccess(actor, locationId)
    const from = request.nextUrl.searchParams.get("from") || rangeDay(new Date(Date.now() - 30 * 86400000)), to = request.nextUrl.searchParams.get("to") || rangeDay()
    const id = request.nextUrl.searchParams.get("id")
    const shifts = await prisma.rangeShift.findMany({ where: { locationId, ...(actor.role === "owner" ? {} : { userId: actor.id }), ...(id ? { id } : { OR: [{ inAt: dateWindow(from, to) }, { outAt: null }] }) }, select: { ...shiftSelect, inPhoto: true, outPhoto: true }, orderBy: { inAt: "desc" }, take: 300 })
    const openShift = await prisma.rangeShift.findFirst({ where: { userId: actor.id, outAt: null }, select: { ...shiftSelect, location: { select: { name: true } } } })
    return Response.json({ shifts: shifts.map(({ inPhoto, outPhoto, ...shift }) => ({ ...shift, hasInPhoto: Boolean(inPhoto), hasOutPhoto: Boolean(outPhoto) })), openShift })
}
export async function attendanceChallenge(request: NextRequest, actor: RangeActor) {
    if (actor.role !== "coach") throw new RangeError("Attendance is recorded for coach accounts.", 403)
    const body = await jsonBody(request), locationId = textField(body.locationId, "Location")
    await locationAccess(actor, locationId)
    const action = textField(body.action, "Action")
    if (!["in", "out"].includes(action)) throw new RangeError("Invalid attendance action.")
    const open = await prisma.rangeShift.findFirst({ where: { userId: actor.id, outAt: null } })
    if (action === "in" && open) throw new RangeError("Check out of your open shift first.", 409)
    if (action === "out" && (!open || open.locationId !== locationId)) throw new RangeError("Choose the location of your open shift before checking out.", 409)
    const challenge = await prisma.rangeAttendanceChallenge.create({ data: { userId: actor.id, locationId, action, shiftId: open?.id, expiresAt: new Date(Date.now() + 120000) } })
    return Response.json({ challengeId: challenge.id, expiresAt: challenge.expiresAt })
}
export async function attendancePunch(request: NextRequest, actor: RangeActor) {
    const receivedAt = new Date()
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) throw new RangeError("Camera photo required.")
    if (Number(request.headers.get("content-length")) > 1700000) throw new RangeError("Camera image is too large.", 413)
    const form = await request.formData(), challengeId = textField(form.get("challengeId"), "Capture challenge")
    const initial = await prisma.rangeAttendanceChallenge.findUnique({ where: { id: challengeId } })
    if (!initial || initial.userId !== actor.id || actor.role !== "coach") throw new RangeError("Invalid capture challenge.", 403)
    await locationAccess(actor, initial.locationId)
    if (initial.usedAt) return Response.json({ ok: true, shiftId: initial.outcomeShiftId })
    if (initial.expiresAt < receivedAt) throw new RangeError("Capture expired. Open the camera again.", 409)
    const photo = form.get("photo")
    if (!(photo instanceof File)) throw new RangeError("Take a live selfie to mark attendance.")
    const publicId = await uploadAttendancePhoto(photo, initial.locationId)
    let keep = false
    try {
        const result = await transaction(async tx => {
            await locationAccess(actor, initial.locationId, tx)
            const user = await tx.rangeUser.findUnique({ where: { id: actor.id } })
            if (!user?.active) throw new RangeError("Account is inactive.", 403)
            const challenge = await tx.rangeAttendanceChallenge.findUniqueOrThrow({ where: { id: challengeId } })
            if (challenge.usedAt) return { ok: true, shiftId: challenge.outcomeShiftId, reused: true }
            if (challenge.expiresAt < receivedAt) throw new RangeError("Capture expired. Open the camera again.", 409)
            const open = await tx.rangeShift.findFirst({ where: { userId: actor.id, outAt: null } })
            if (challenge.action === "in" && open) throw new RangeError("A shift is already open.", 409)
            if (challenge.action === "out" && (!open || open.id !== challenge.shiftId || open.locationId !== challenge.locationId || receivedAt <= open.inAt)) throw new RangeError("Shift changed. Refresh and try again.", 409)
            const shift = challenge.action === "in" ? await tx.rangeShift.create({ data: { userId: actor.id, locationId: challenge.locationId, inAt: receivedAt, originalInAt: receivedAt, inPhoto: publicId, openKey: actor.id } }) : await tx.rangeShift.update({ where: { id: open!.id }, data: { outAt: receivedAt, originalOutAt: receivedAt, outPhoto: publicId, openKey: null, version: { increment: 1 } } })
            await tx.rangeAttendanceChallenge.update({ where: { id: challengeId }, data: { usedAt: receivedAt, outcomeShiftId: shift.id } })
            await audit(tx, actor, `attendance.${challenge.action}`, shift.id, open || undefined, shift, shift.locationId)
            return { ok: true, shiftId: shift.id, reused: false }
        })
        keep = !result.reused
        return Response.json(result)
    } finally { if (!keep) await removeAttendancePhoto(publicId) }
}
export async function attendancePhoto(request: NextRequest, actor: RangeActor) {
    const shift = await prisma.rangeShift.findUnique({ where: { id: request.nextUrl.searchParams.get("id") || "" } })
    if (!shift || (actor.role !== "owner" && shift.userId !== actor.id)) throw new RangeError("Photo not found.", 404)
    await locationAccess(actor, shift.locationId)
    const photo = request.nextUrl.searchParams.get("side") === "out" ? shift.outPhoto : shift.inPhoto
    if (!photo) throw new RangeError("No camera photo is attached to this punch.", 404)
    return new Response(null, { status: 302, headers: { Location: attendancePhotoUrl(photo), "Referrer-Policy": "no-referrer" } })
}
export async function attendanceCorrect(request: NextRequest, actor: RangeActor) {
    ownerOnly(actor)
    const body = await jsonBody(request), locationId = textField(body.locationId, "Location"), reason = textField(body.reason, "Correction reason", 1000)
    const inAt = indiaTime(body.inAt), outAt = body.outAt ? indiaTime(body.outAt) : null
    if (outAt && outAt <= inAt) throw new RangeError("Departure must be after arrival.")
    await locationAccess(actor, locationId)
    return Response.json(await transaction(async tx => {
        const before = body.id ? await tx.rangeShift.findUnique({ where: { id: String(body.id) } }) : null
        if (body.id && (!before || before.locationId !== locationId)) throw new RangeError("Shift not found.", 404)
        if (before && before.version !== body.version) throw new RangeError("Shift changed. Refresh before correcting.", 409)
        const userId = before?.userId || textField(body.userId, "Coach")
        const coach = await tx.rangeUser.findUnique({ where: { id: userId } })
        if (coach?.role !== "coach" || (!before && !await tx.rangeMembership.findUnique({ where: { userId_locationId: { userId, locationId } } }))) throw new RangeError("Select a coach assigned to this location.")
        const overlap = await tx.rangeShift.findFirst({ where: { userId, ...(before ? { id: { not: before.id } } : {}), ...(outAt ? { inAt: { lt: outAt } } : {}), OR: [{ outAt: null }, { outAt: { gt: inAt } }] } })
        if (overlap) throw new RangeError("These times overlap another shift. Correct the existing shift first.", 409)
        if (body.requestId) {
            const correction = await tx.rangeCorrection.findUnique({ where: { id: String(body.requestId) } })
            if (!correction || correction.locationId !== locationId || correction.kind !== "coachAttendance" || correction.entityId !== (before?.id || userId) || correction.status !== "pending") throw new RangeError("Correction request changed or does not match this shift.", 409)
            await tx.rangeCorrection.update({ where: { id: correction.id }, data: { status: "resolved", resolution: reason, resolvedById: actor.id, resolvedAt: new Date() } })
        }
        const data = { inAt, outAt, openKey: outAt ? null : userId, adjusted: true }
        const shift = before ? await tx.rangeShift.update({ where: { id: before.id }, data: { ...data, version: { increment: 1 } } }) : await tx.rangeShift.create({ data: { ...data, userId, locationId } })
        await audit(tx, actor, "attendance.corrected", shift.id, before || undefined, shift, locationId, reason)
        return { ok: true }
    }))
}
