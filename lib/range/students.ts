import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { digest } from "./auth"
import { RangeActor, RangeError, dateField, normalizePhone, rangeDay, textField } from "./shared"
import { audit, jsonBody, locationAccess, ownerOnly, transaction } from "./server"

export const studentStatuses = ["present", "absent", "leave", "unmarked"] as const
function optionalContact(value: unknown) { return value ? normalizePhone(value) : null }
export async function studentsAction(request: NextRequest, actor: RangeActor) {
    if (request.method === "GET") {
        const locationId = textField(request.nextUrl.searchParams.get("locationId"), "Location"), date = dateField(request.nextUrl.searchParams.get("date") || rangeDay())
        await locationAccess(actor, locationId)
        const students = await prisma.rangeEnrollment.findMany({ where: { locationId }, include: { profile: true, attendance: { where: { date }, include: { markedBy: { select: { name: true } } } } }, orderBy: { profile: { name: "asc" } }, take: 1000 })
        return Response.json({ students, date })
    }
    const body = await jsonBody(request), locationId = textField(body.locationId, "Location"), startDate = dateField(body.startDate, "Enrollment date"), endDate = body.endDate ? dateField(body.endDate, "End date") : null
    await locationAccess(actor, locationId)
    const discipline = textField(body.discipline, "Discipline")
    if (!["pistol", "rifle", "both"].includes(discipline)) throw new RangeError("Choose pistol, rifle, or both.")
    if (endDate && endDate < startDate) throw new RangeError("Enrollment end date must follow its start.")
    if (body.id || body.profileId) ownerOnly(actor)
    const profileData = { name: textField(body.name, "Student name", 100), phone: optionalContact(body.phone), guardianName: body.guardianName ? textField(body.guardianName, "Guardian name", 100) : null, guardianPhone: optionalContact(body.guardianPhone) }
    if (!profileData.phone && !profileData.guardianPhone) throw new RangeError("Enter a student or guardian phone number.")
    if (body.id && typeof body.active !== "boolean") throw new RangeError("Choose an enrollment status.")
    const submissionKey = body.id ? "" : textField(body.submissionKey, "Submission key", 100)
    const submissionHash = digest(JSON.stringify({ locationId, startDate, endDate, discipline, ...profileData, profileId: body.profileId || null }))
    return Response.json(await transaction(async tx => {
        if (!body.id) {
            const existing = await tx.rangeEnrollment.findUnique({ where: { submissionKey } })
            if (existing) {
                if (existing.createdById !== actor.id || existing.submissionHash !== submissionHash) throw new RangeError("This submission key was already used.", 409)
                return { ok: true, enrollmentId: existing.id }
            }
        }
        const before = body.id ? await tx.rangeEnrollment.findUnique({ where: { id: String(body.id) }, include: { profile: true } }) : null
        if (body.id && (!before || before.locationId !== locationId)) throw new RangeError("Student enrollment not found.", 404)
        if (before && before.version !== body.version) throw new RangeError("Student changed. Refresh before saving.", 409)
        const profile = before ? await tx.rangeShooterProfile.update({ where: { id: before.profileId }, data: profileData }) : body.profileId ? await tx.rangeShooterProfile.findUnique({ where: { id: String(body.profileId) } }) : await tx.rangeShooterProfile.create({ data: profileData })
        if (!profile) throw new RangeError("Shooter profile not found.", 404)
        const data = { discipline, startDate, endDate, active: before ? body.active as boolean : true }
        const enrollment = before ? await tx.rangeEnrollment.update({ where: { id: before.id }, data: { ...data, version: { increment: 1 } } }) : await tx.rangeEnrollment.create({ data: { ...data, profileId: profile.id, locationId, createdById: actor.id, submissionKey, submissionHash } })
        await audit(tx, actor, before ? "student.updated" : "student.enrolled", enrollment.id, before || undefined, { ...enrollment, profile }, locationId, before ? textField(body.reason, "Reason for change", 1000) : undefined)
        return { ok: true, enrollmentId: enrollment.id }
    }))
}
export async function studentAttendance(request: NextRequest, actor: RangeActor) {
    const body = await jsonBody(request), locationId = textField(body.locationId, "Location"), date = dateField(body.date), submissionKey = textField(body.submissionKey, "Submission key", 100)
    await locationAccess(actor, locationId)
    if (date > rangeDay()) throw new RangeError("Attendance cannot be in the future.")
    if (actor.role !== "owner" && date !== rangeDay()) throw new RangeError("Ask the owner to correct earlier attendance.", 403)
    if (!Array.isArray(body.rows) || !body.rows.length || body.rows.length > 1000) throw new RangeError("Select between 1 and 1000 attendance records.")
    const rows = body.rows.map(row => {
        if (!row || typeof row !== "object") throw new RangeError("Invalid attendance row.")
        const enrollmentId = textField(row.enrollmentId, "Student"), status = textField(row.status, "Status")
        if (!studentStatuses.includes(status as typeof studentStatuses[number]) || !Number.isInteger(row.version) || row.version < 0) throw new RangeError("Invalid attendance status or version.")
        return { enrollmentId, status, version: row.version as number }
    })
    if (new Set(rows.map(r => r.enrollmentId)).size !== rows.length) throw new RangeError("Duplicate students in attendance submission.")
    return Response.json(await transaction(async tx => {
        for (const row of rows) {
            const enrollment = await tx.rangeEnrollment.findUnique({ where: { id: row.enrollmentId } })
            if (!enrollment || enrollment.locationId !== locationId) throw new RangeError("Student not found at this location.", 404)
            if (enrollment.startDate > date || (enrollment.endDate && enrollment.endDate < date) || (date === rangeDay() && !enrollment.active)) throw new RangeError("Student is not enrolled on this date.")
            const before = await tx.rangeStudentAttendance.findUnique({ where: { enrollmentId_date: { enrollmentId: row.enrollmentId, date } } })
            if (before?.submissionKey === submissionKey) {
                if (before.status !== row.status || before.markedById !== actor.id) throw new RangeError("Submission key already used.", 409)
                continue
            }
            if ((before?.version || 0) !== row.version) throw new RangeError("Attendance changed. Refresh the roll before saving.", 409)
            if (before && before.status !== "unmarked" && actor.role !== "owner") throw new RangeError("Request a correction for previously marked attendance.", 403)
            if (before && actor.role === "owner") textField(body.reason, "Reason for attendance correction", 1000)
            const data = { status: row.status, markedById: actor.id, submissionKey }
            const after = before ? await tx.rangeStudentAttendance.update({ where: { id: before.id }, data: { ...data, version: { increment: 1 } } }) : await tx.rangeStudentAttendance.create({ data: { ...data, enrollmentId: row.enrollmentId, date } })
            await audit(tx, actor, before ? "student.attendance.corrected" : "student.attendance.marked", after.id, before || undefined, after, locationId, typeof body.reason === "string" ? body.reason : undefined)
        }
        if (body.requestId) {
            ownerOnly(actor)
            const correction = await tx.rangeCorrection.findUnique({ where: { id: String(body.requestId) } })
            if (!correction || correction.locationId !== locationId || correction.kind !== "studentAttendance" || correction.status !== "pending" || rows.length !== 1 || correction.entityId !== rows[0].enrollmentId || (correction.proposed as Record<string, unknown>).date !== date) throw new RangeError("Correction request does not match this attendance.", 409)
            await tx.rangeCorrection.update({ where: { id: correction.id }, data: { status: "resolved", resolution: textField(body.reason, "Resolution reason", 1000), resolvedById: actor.id, resolvedAt: new Date() } })
        }
        return { ok: true }
    }))
}
export async function studentHistory(request: NextRequest, actor: RangeActor) {
    const enrollmentId = textField(request.nextUrl.searchParams.get("enrollmentId"), "Student"), enrollment = await prisma.rangeEnrollment.findUnique({ where: { id: enrollmentId }, include: { profile: true } })
    if (!enrollment) throw new RangeError("Student not found.", 404)
    await locationAccess(actor, enrollment.locationId)
    const from = dateField(request.nextUrl.searchParams.get("from") || "2000-01-01"), to = dateField(request.nextUrl.searchParams.get("to") || rangeDay())
    const history = await prisma.rangeStudentAttendance.findMany({ where: { enrollmentId, date: { gte: from, lte: to } }, include: { markedBy: { select: { name: true } } }, orderBy: { date: "desc" }, take: 1000 })
    return Response.json({ enrollment, history })
}
