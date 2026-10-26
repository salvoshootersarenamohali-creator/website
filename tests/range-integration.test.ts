import { randomUUID } from "node:crypto"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { digest, hashPassword, SESSION_COOKIE } from "@/lib/range/auth"
import { GET, POST } from "@/app/api/range/[...path]/route"
import { locationAccess } from "@/lib/range/server"
import { rangeDay, type RangeActor } from "@/lib/range/shared"

vi.mock("@/lib/range/media", () => ({ uploadAttendancePhoto: vi.fn(async () => `test-private-${randomUUID()}`), removeAttendancePhoto: vi.fn(async () => {}), attendancePhotoUrl: vi.fn(() => "https://example.test/private-photo") }))
import { uploadAttendancePhoto } from "@/lib/range/media"

const enabled = Boolean(process.env.TEST_DATABASE_URL)
const prefix = `range-test-${randomUUID()}`
const ownerId = `${prefix}-owner`, coachId = `${prefix}-coach`, otherId = `${prefix}-other`, temporaryId = `${prefix}-temporary`
const locationId = `${prefix}-location`, otherLocationId = `${prefix}-other-location`
const actor: RangeActor = { id: coachId, name: "Test coach", phone: "+919000000002", role: "coach", mustChangePassword: false }
const password = "Test range password!"
const studentIds: string[] = []
function request(path: string, token?: string, body?: unknown) {
    return new NextRequest(`http://localhost/api/range/${path}`, { method: body === undefined ? "GET" : "POST", headers: { origin: "http://localhost", ...(token ? { cookie: `${SESSION_COOKIE}=${token}` } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) })
}
async function call(path: string, token?: string, body?: unknown) {
    const req = request(path, token, body)
    return (body === undefined ? GET : POST)(req, { params: Promise.resolve({ path: path.split("?")[0].split("/") }) })
}
async function punch(challengeId: string, token = coachId, withPhoto = true) {
    const body = new FormData(); body.set("challengeId", challengeId)
    if (withPhoto) body.set("photo", new File([new Uint8Array(200)], "selfie.jpg", { type: "image/jpeg" }))
    return POST(new NextRequest("http://localhost/api/range/attendance/punch", { method: "POST", headers: { origin: "http://localhost", cookie: `${SESSION_COOKIE}=${token}` }, body }), { params: Promise.resolve({ path: ["attendance", "punch"] }) })
}
async function challenge(action: string) { return (await (await call("attendance/challenge", coachId, { locationId, action })).json()).challengeId as string }

describe.skipIf(!enabled)("range APIs against isolated PostgreSQL", () => {
    beforeAll(async () => {
        const url = new URL(process.env.TEST_DATABASE_URL!)
        if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) throw new Error("Range integration tests require matching localhost DATABASE_URL and TEST_DATABASE_URL.")
        await prisma.rangeLocation.createMany({ data: [{ id: locationId, name: "Test Zirakpur", slug: `${prefix}-a` }, { id: otherLocationId, name: "Test Mohali", slug: `${prefix}-b` }] })
        const passwordHash = await hashPassword(password)
        for (const [id, role, phone, mustChangePassword] of [[ownerId, "owner", "+919000000001", false], [coachId, "coach", actor.phone, false], [otherId, "coach", "+919000000003", false], [temporaryId, "coach", "+919000000004", true]] as const) {
            await prisma.rangeUser.create({ data: { id, name: id, role, phone, passwordHash, mustChangePassword, memberships: { create: [{ locationId: id === otherId ? otherLocationId : locationId }] } } })
            await prisma.rangeSession.create({ data: { tokenHash: digest(id), userId: id, expiresAt: new Date(Date.now() + 3600000) } })
        }
    })
    afterAll(async () => {
        const ids = [ownerId, coachId, otherId, temporaryId]
        const enrollments = await prisma.rangeEnrollment.findMany({ where: { locationId: { in: [locationId, otherLocationId] } } })
        await prisma.rangeStudentAttendance.deleteMany({ where: { enrollmentId: { in: enrollments.map(e => e.id) } } })
        await prisma.rangeEnrollment.deleteMany({ where: { id: { in: enrollments.map(e => e.id) } } })
        await prisma.rangeShooterProfile.deleteMany({ where: { id: { in: enrollments.map(e => e.profileId) } } })
        await prisma.rangeCorrection.deleteMany({ where: { locationId: { in: [locationId, otherLocationId] } } })
        await prisma.rangeAttendanceChallenge.deleteMany({ where: { userId: { in: ids } } })
        await prisma.rangeShift.deleteMany({ where: { userId: { in: ids } } })
        await prisma.rangeAudit.deleteMany({ where: { actorId: { in: ids } } })
        await prisma.rangeUser.deleteMany({ where: { id: { in: ids } } })
        await prisma.rangeLocation.deleteMany({ where: { id: { in: [locationId, otherLocationId] } } })
        await prisma.rangeLoginAttempt.deleteMany({ where: { phoneHash: { in: ["+919000000001", "+919000000002", "+919000000003", "+919000000004"].map(digest) } } })
        await prisma.$disconnect()
    })
    it("rejects anonymous callers and competition PINs", async () => {
        expect((await call("session")).status).toBe(401)
        const req = request("staff"); req.headers.set("x-admin-pin", "test-admin")
        expect((await GET(req, { params: Promise.resolve({ path: ["staff"] }) })).status).toBe(401)
    })
    it("scopes locations and denies owner APIs to coaches", async () => {
        const data = await (await call("session", coachId)).json()
        expect(data.locations.map((l: { id: string }) => l.id)).toEqual([locationId])
        expect(data.user.passwordHash).toBeUndefined()
        expect((await call("staff", coachId)).status).toBe(403)
        await expect(locationAccess(actor, otherLocationId)).rejects.toThrow("denied")
    })
    it("keeps temporary-password sessions out of operational APIs", async () => {
        expect((await call("locations", temporaryId)).status).toBe(403)
    })
    it("signs in with a secure opaque session", async () => {
        const response = await call("login", undefined, { phone: actor.phone, password })
        expect(response.status).toBe(200)
        expect(response.headers.get("set-cookie")).toContain("HttpOnly")
        expect(response.headers.get("set-cookie")).toContain("SameSite=lax")
        expect((await response.json()).user.passwordHash).toBeUndefined()
    })
    it("rate limits repeated login attempts", async () => {
        for (let i = 0; i < 5; i++) expect((await call("login", undefined, { phone: "+919000000003", password: "wrong" })).status).toBe(401)
        expect((await call("login", undefined, { phone: "+919000000003", password })).status).toBe(429)
    })
    it("revokes all sessions on owner reset and blocks disabled accounts", async () => {
        const reset = await call("staff", ownerId, { id: otherId, name: "Other coach", phone: "+919000000003", password: "New temporary password!", active: false, locationIds: [otherLocationId] })
        expect(reset.status).toBe(200)
        expect((await call("session", otherId)).status).toBe(401)
        expect(await prisma.rangeSession.count({ where: { userId: otherId } })).toBe(0)
        const audit = await prisma.rangeAudit.findFirstOrThrow({ where: { entityId: otherId } })
        expect(JSON.stringify(audit)).not.toContain("passwordHash")
        expect(JSON.stringify(audit)).not.toContain("temporary password")
    })
    it("requires a photo and leaves attendance unchanged if uploading fails", async () => {
        const id = await challenge("in")
        expect((await punch(id, coachId, false)).status).toBe(400)
        vi.mocked(uploadAttendancePhoto).mockRejectedValueOnce(new Error("Storage unavailable"))
        expect((await punch(id)).status).toBe(500)
        expect(await prisma.rangeShift.count({ where: { userId: coachId } })).toBe(0)
        expect((await prisma.rangeAttendanceChallenge.findUniqueOrThrow({ where: { id } })).usedAt).toBeNull()
    })
    it("rejects expired captures and forged location access", async () => {
        const id = await challenge("in")
        await prisma.rangeAttendanceChallenge.update({ where: { id }, data: { expiresAt: new Date(0) } })
        expect((await punch(id)).status).toBe(409)
        expect((await call(`attendance?locationId=${otherLocationId}`, coachId)).status).toBe(403)
        expect((await call("attendance/challenge", coachId, { locationId, action: "out" })).status).toBe(409)
    })
    it("commits one check-in for concurrent requests and safely replays successful captures", async () => {
        const first = await challenge("in"), second = await challenge("in")
        const results = await Promise.all([punch(first), punch(second)])
        expect(results.map(r => r.status).sort()).toEqual([200, 409])
        expect(await prisma.rangeShift.count({ where: { userId: coachId, outAt: null } })).toBe(1)
        const used = await prisma.rangeAttendanceChallenge.findFirstOrThrow({ where: { userId: coachId, usedAt: { not: null } } })
        expect((await punch(used.id, coachId, false)).status).toBe(200)
        expect((await call("attendance/challenge", coachId, { locationId, action: "in" })).status).toBe(409)
        const out = await challenge("out")
        expect((await punch(out)).status).toBe(200)
        expect((await punch(out, coachId, false)).status).toBe(200)
        expect(await prisma.rangeShift.count({ where: { userId: coachId, outAt: null } })).toBe(0)
        expect((await punch(await challenge("in"))).status).toBe(200)
        expect((await punch(await challenge("out"))).status).toBe(200)
        expect(await prisma.rangeShift.count({ where: { userId: coachId } })).toBe(2)
    })
    it("keeps owner corrections audited and rejects stale versions / overlapping shifts", async () => {
        const shift = await prisma.rangeShift.findFirstOrThrow({ where: { userId: coachId }, orderBy: { inAt: "asc" } })
        expect((await call("attendance/correct", coachId, { locationId })).status).toBe(403)
        const data = { id: shift.id, version: shift.version, locationId, inAt: "2026-10-01T08:00", outAt: "2026-10-01T10:00", reason: "Forgot to mark the actual shift" }
        expect((await call("attendance/correct", ownerId, data)).status).toBe(200)
        expect((await call("attendance/correct", ownerId, data)).status).toBe(409)
        const updated = await prisma.rangeShift.findUniqueOrThrow({ where: { id: shift.id } })
        expect(updated.originalInAt).toEqual(shift.originalInAt)
        expect(updated.inPhoto).toBe(shift.inPhoto)
        expect(updated.adjusted).toBe(true)
        expect((await call("attendance/correct", ownerId, { ...data, id: undefined, userId: coachId, inAt: "2026-10-01T09:00", outAt: "2026-10-01T11:00" })).status).toBe(409)
        expect((await call(`attendance/photo?id=${shift.id}&side=in`, ownerId)).status).toBe(302)
        expect((await call(`attendance/photo?id=not-a-shift`, coachId)).status).toBe(404)
    })
    it("resolves a coach correction request atomically with a missed shift", async () => {
        expect((await call("corrections", coachId, { locationId, kind: "coachAttendance", entityId: coachId, reason: "Missed both punches", proposed: { inAt: "2026-10-02T08:00", outAt: "2026-10-02T10:00" } })).status).toBe(200)
        const correction = await prisma.rangeCorrection.findFirstOrThrow({ where: { userId: coachId, status: "pending" } })
        expect((await call("attendance/correct", ownerId, { locationId, userId: coachId, requestId: correction.id, inAt: "2026-10-02T08:00", outAt: "2026-10-02T10:00", reason: "Confirmed with coach" })).status).toBe(200)
        expect((await prisma.rangeCorrection.findUniqueOrThrow({ where: { id: correction.id } })).status).toBe("resolved")
    })
    it("creates stable student identities, allows shared guardian phones and deduplicates retries", async () => {
        const data = { locationId, name: "Sibling One", guardianName: "Parent", guardianPhone: "9000000088", discipline: "pistol", startDate: "2026-01-01", submissionKey: randomUUID() }
        const first = await call("students", coachId, data)
        expect(first.status).toBe(200)
        const id = (await first.json()).enrollmentId; studentIds.push(id)
        expect((await (await call("students", coachId, data)).json()).enrollmentId).toBe(id)
        const second = await call("students", coachId, { ...data, name: "Sibling Two", submissionKey: randomUUID() })
        expect(second.status).toBe(200); studentIds.push((await second.json()).enrollmentId)
        expect((await call(`students?locationId=${otherLocationId}`, coachId)).status).toBe(403)
        const roster = await (await call(`students?locationId=${locationId}`, coachId)).json()
        expect(roster.students).toHaveLength(2)
        expect(roster.students.every((s: { attendance: unknown[] }) => s.attendance.length === 0)).toBe(true)
    })
    it("marks one student/day atomically and refuses concurrent or unauthorized overwrites", async () => {
        const data = { locationId, date: rangeDay(), submissionKey: randomUUID(), rows: [{ enrollmentId: studentIds[0], status: "present", version: 0 }] }
        const responses = await Promise.all([call("students/attendance", coachId, data), call("students/attendance", ownerId, { ...data, submissionKey: randomUUID(), rows: [{ ...data.rows[0], status: "absent" }] })])
        expect(responses.map(r => r.status).sort()).toEqual([200, 409])
        expect(await prisma.rangeStudentAttendance.count({ where: { enrollmentId: studentIds[0], date: rangeDay() } })).toBe(1)
        const mark = await prisma.rangeStudentAttendance.findFirstOrThrow({ where: { enrollmentId: studentIds[0], date: rangeDay() } })
        expect((await call("students/attendance", coachId, { ...data, submissionKey: randomUUID(), rows: [{ ...data.rows[0], status: "leave", version: mark.version }] })).status).toBe(403)
        expect((await call("students/attendance", coachId, { ...data, submissionKey: randomUUID(), rows: [{ enrollmentId: studentIds[1], status: "present", version: 0 }, { enrollmentId: "forged-student", status: "present", version: 0 }] })).status).toBe(404)
        expect(await prisma.rangeStudentAttendance.count({ where: { enrollmentId: studentIds[1] } })).toBe(0)
    })
    it("supports historical owner corrections and blocks attendance outside enrollment", async () => {
        const data = { locationId, date: "2026-10-10", submissionKey: randomUUID(), rows: [{ enrollmentId: studentIds[1], status: "leave", version: 0 }] }
        expect((await call("students/attendance", coachId, data)).status).toBe(403)
        expect((await call("students/attendance", ownerId, data)).status).toBe(200)
        const student = await prisma.rangeEnrollment.findUniqueOrThrow({ where: { id: studentIds[1] } })
        expect((await call("students", coachId, { ...student, locationId, name: "Edited", guardianPhone: "9000000088" })).status).toBe(403)
        await prisma.rangeEnrollment.update({ where: { id: student.id }, data: { active: false } })
        expect((await call("students/attendance", ownerId, { ...data, date: rangeDay(), submissionKey: randomUUID() })).status).toBe(400)
        const history = await (await call(`students/history?enrollmentId=${student.id}`, coachId)).json()
        expect(history.history[0].status).toBe("leave")
    })
})
