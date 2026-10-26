import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { RangeActor, RangeError, textField } from "./shared"
import { audit, jsonBody, locationAccess, ownerOnly, snapshot, transaction } from "./server"

export async function correctionsAction(request: NextRequest, actor: RangeActor) {
    if (request.method === "GET") {
        const locationId = textField(request.nextUrl.searchParams.get("locationId"), "Location")
        await locationAccess(actor, locationId)
        const requests = await prisma.rangeCorrection.findMany({ where: { locationId, ...(actor.role === "owner" ? {} : { userId: actor.id }) }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 200 })
        return Response.json({ requests })
    }
    const body = await jsonBody(request), locationId = textField(body.locationId, "Location"), entityId = textField(body.entityId, "Record"), reason = textField(body.reason, "Reason", 1000)
    await locationAccess(actor, locationId)
    if (!["coachAttendance", "studentAttendance"].includes(String(body.kind))) throw new RangeError("Invalid correction type.")
    if (body.kind === "studentAttendance") {
        const enrollment = await prisma.rangeEnrollment.findUnique({ where: { id: entityId } })
        if (!enrollment || enrollment.locationId !== locationId) throw new RangeError("Student not found.", 404)
    } else if (entityId !== actor.id) {
        const shift = await prisma.rangeShift.findUnique({ where: { id: entityId } })
        if (!shift || shift.locationId !== locationId || (actor.role !== "owner" && shift.userId !== actor.id)) throw new RangeError("Record not found.", 404)
    }
    return Response.json(await transaction(async tx => {
        const correction = await tx.rangeCorrection.create({ data: { userId: actor.id, locationId, entityId, kind: String(body.kind), reason, proposed: snapshot(body.proposed || {}) } })
        await audit(tx, actor, "correction.requested", correction.id, undefined, correction, locationId)
        return { ok: true }
    }))
}
export async function rejectCorrection(request: NextRequest, actor: RangeActor) {
    ownerOnly(actor)
    const body = await jsonBody(request), id = textField(body.id, "Request"), reason = textField(body.reason, "Resolution reason", 1000)
    return Response.json(await transaction(async tx => {
        const before = await tx.rangeCorrection.findUnique({ where: { id } })
        if (!before || before.status !== "pending") throw new RangeError("Request is no longer pending.", 409)
        await locationAccess(actor, before.locationId, tx)
        const after = await tx.rangeCorrection.update({ where: { id }, data: { status: "rejected", resolution: reason, resolvedAt: new Date(), resolvedById: actor.id } })
        await audit(tx, actor, "correction.rejected", id, before, after, before.locationId, reason)
        return { ok: true }
    }))
}
