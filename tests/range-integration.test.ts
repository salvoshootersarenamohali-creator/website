import { randomUUID } from "node:crypto"
import * as XLSX from "xlsx"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { digest, hashPassword, SESSION_COOKIE } from "@/lib/range/auth"
import { GET, POST } from "@/app/api/range/[...path]/route"
import { locationAccess } from "@/lib/range/server"
import { rangeDay, type RangeActor } from "@/lib/range/shared"

vi.mock("@/lib/range/media", () => ({ uploadAttendancePhoto: vi.fn(async () => `test-private-${randomUUID()}`), uploadReceipt: vi.fn(async () => `test-receipt-${randomUUID()}`), removeAttendancePhoto: vi.fn(async () => {}), attendancePhotoUrl: vi.fn(() => "https://example.test/private-photo") }))
import { uploadAttendancePhoto, uploadReceipt } from "@/lib/range/media"

const enabled = Boolean(process.env.TEST_DATABASE_URL)
const prefix = `range-test-${randomUUID()}`
const ownerId = `${prefix}-owner`, coachId = `${prefix}-coach`, otherId = `${prefix}-other`, temporaryId = `${prefix}-temporary`
const locationId = `${prefix}-location`, otherLocationId = `${prefix}-other-location`
const actor: RangeActor = { id: coachId, name: "Test coach", phone: "+919000000002", role: "coach", mustChangePassword: false }
const password = "Test range password!"
const studentIds: string[] = []
let coachCash = "", kartikCash = "", salvoOnline = "", otherCash = "", productId = "", incomeCategory = "", expenseCategory = "", saleId = ""
function saleData(overrides: Record<string, unknown> = {}) { return { locationId, kind: "income", amountPaise: 95000, occurredOn: rangeDay(), description: "One pellet box", categoryId: incomeCategory, productId, quantity: 1, unitPricePaise: 95000, payments: [{ accountId: coachCash, method: "cash", amountPaise: 50000 }, { accountId: salvoOnline, method: "online", amountPaise: 45000 }], submissionKey: randomUUID(), ...overrides } }
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
        const financeWhere = { locationId: { in: [locationId, otherLocationId] } }
        await prisma.rangeTransfer.deleteMany({ where: financeWhere })
        const finances = await prisma.rangeFinanceTransaction.findMany({ where: financeWhere })
        await prisma.rangeSalaryPayment.deleteMany({ where: { transactionId: { in: finances.map(t => t.id) } } })
        await prisma.rangeStudentFee.deleteMany({ where: { transactionId: { in: finances.map(t => t.id) } } })
        await prisma.rangeMoneyMovement.deleteMany({ where: { transactionId: { in: finances.map(t => t.id) } } })
        await prisma.rangeFinanceTransaction.updateMany({ where: financeWhere, data: { correctsId: null, refundOfId: null } })
        await prisma.rangeFinanceTransaction.deleteMany({ where: financeWhere })
        await prisma.rangeMoneyAccount.deleteMany({ where: financeWhere })
        await prisma.rangeProduct.deleteMany({ where: financeWhere })
        await prisma.rangeFinanceCategory.deleteMany({ where: financeWhere })
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
    it("sets up finance accounts and hides shared balances from coaches", async () => {
        expect((await call("finance/settings", ownerId, { type: "account", locationId, name: "Future opening", custodian: "salvo", channel: "cash", openingPaise: 0, openingDate: "2099-01-01" })).status).toBe(400)
        for (const [name, custodian, channel, coach] of [["Coach cash", "coach", "cash", coachId], ["Kartik cash", "kartik", "cash", null], ["Salvo bank", "salvo", "online", null]] as const) {
            expect((await call("finance/settings", ownerId, { type: "account", locationId, name, custodian, channel, coachId: coach, openingPaise: 10000, openingDate: "2026-10-01" })).status).toBe(200)
        }
        otherCash = (await prisma.rangeMoneyAccount.create({ data: { locationId, name: "Other coach cash", custodian: "coach", coachId: otherId, channel: "cash", openingPaise: 50000, openingDate: "2026-10-01" } })).id
        const accounts = await prisma.rangeMoneyAccount.findMany({ where: { locationId } })
        coachCash = accounts.find(a => a.name === "Coach cash")!.id; kartikCash = accounts.find(a => a.name === "Kartik cash")!.id; salvoOnline = accounts.find(a => a.name === "Salvo bank")!.id
        expect((await call("finance/settings", ownerId, { type: "category", locationId, name: "Product sales", kind: "income" })).status).toBe(200)
        expect((await call("finance/settings", ownerId, { type: "category", locationId, name: "Supplies", kind: "expense" })).status).toBe(200)
        const categories = await prisma.rangeFinanceCategory.findMany({ where: { locationId } }); incomeCategory = categories.find(c => c.kind === "income")!.id; expenseCategory = categories.find(c => c.kind === "expense")!.id
        expect((await call("finance/settings", ownerId, { type: "product", locationId, name: "Pellet box", unit: "box", defaultPricePaise: 95000 })).status).toBe(200)
        productId = (await prisma.rangeProduct.findFirstOrThrow({ where: { locationId } })).id
        const coachMeta = await (await call(`finance/meta?locationId=${locationId}`, coachId)).json()
        expect(coachMeta.accounts.some((a: { id: string }) => a.id === otherCash)).toBe(false)
        expect(coachMeta.accounts.find((a: { id: string }) => a.id === salvoOnline).balancePaise).toBeUndefined()
        expect(coachMeta.accounts.find((a: { id: string }) => a.id === coachCash).balancePaise).toBe(10000)
        expect((await call("finance/settings", coachId, { type: "product", locationId })).status).toBe(403)
    })
    it("posts split sales once and rejects mismatches / other coach accounts atomically", async () => {
        const data = saleData(), response = await call("finance", coachId, data)
        expect(response.status).toBe(200); saleId = (await response.json()).transactionId
        expect((await (await call("finance", coachId, data)).json()).transactionId).toBe(saleId)
        expect(await prisma.rangeMoneyMovement.count({ where: { transactionId: saleId } })).toBe(2)
        expect((await call("finance", coachId, saleData({ amountPaise: 95001 }))).status).toBe(400)
        expect((await call("finance", coachId, saleData({ payments: [{ accountId: otherCash, method: "cash", amountPaise: 95000 }] }))).status).toBe(403)
        expect(await prisma.rangeFinanceTransaction.count({ where: { locationId } })).toBe(1)
        const meta = await (await call(`finance/meta?locationId=${locationId}`, ownerId)).json()
        expect(meta.accounts.find((a: { id: string }) => a.id === coachCash).balancePaise).toBe(60000)
        expect(meta.accounts.find((a: { id: string }) => a.id === salvoOnline).balancePaise).toBe(55000)
    })
    it("keeps historical entries before opening cutoffs out of current balances", async () => {
        expect((await call("finance", ownerId, saleData({ occurredOn: "2026-09-01", productId: undefined, quantity: undefined, unitPricePaise: undefined, payments: [{ accountId: kartikCash, method: "cash", amountPaise: 95000 }] }))).status).toBe(200)
        const meta = await (await call(`finance/meta?locationId=${locationId}`, ownerId)).json()
        expect(meta.accounts.find((a: { id: string }) => a.id === kartikCash).balancePaise).toBe(10000)
        const coachRecords = await (await call(`finance?locationId=${locationId}&from=2026-01-01`, coachId)).json()
        expect(coachRecords.entries).toHaveLength(1)
    })
    it("voids/replaces incorrect entries with history and distinguishes actual refunds", async () => {
        const original = await prisma.rangeFinanceTransaction.findUniqueOrThrow({ where: { id: saleId } })
        const corrected = await call("finance/correct", ownerId, saleData({ id: saleId, version: original.version, amountPaise: 90000, unitPricePaise: 90000, payments: [{ accountId: coachCash, method: "cash", amountPaise: 90000 }], reason: "Actual sale price was ₹900" }))
        expect(corrected.status).toBe(200)
        const replacementId = (await corrected.json()).transactionId
        expect((await prisma.rangeFinanceTransaction.findUniqueOrThrow({ where: { id: saleId } })).status).toBe("void")
        const replacement = await prisma.rangeFinanceTransaction.findUniqueOrThrow({ where: { id: replacementId } })
        expect(replacement.recordedById).toBe(coachId)
        const refund = saleData({ kind: "expense", categoryId: expenseCategory, productId: undefined, quantity: undefined, unitPricePaise: undefined, refundOfId: replacementId, amountPaise: 10000, payments: [{ accountId: coachCash, method: "cash", amountPaise: 10000 }] })
        expect((await call("finance", coachId, refund)).status).toBe(403)
        expect((await call("finance", ownerId, refund)).status).toBe(200)
        expect((await call("finance", ownerId, { ...refund, submissionKey: randomUUID(), amountPaise: 90000, payments: [{ accountId: coachCash, method: "cash", amountPaise: 90000 }] })).status).toBe(400)
        expect((await call("finance/void", ownerId, { id: replacementId, version: replacement.version, reason: "Must resolve refund first" })).status).toBe(400)
    })
    it("leaves the ledger unchanged if an optional receipt upload fails", async () => {
        const before = await prisma.rangeFinanceTransaction.count({ where: { locationId } })
        const form = new FormData(); form.set("payload", JSON.stringify(saleData())); form.set("receipt", new File(["receipt"], "receipt.png", { type: "image/png" }))
        vi.mocked(uploadReceipt).mockRejectedValueOnce(new Error("Receipt storage unavailable"))
        const response = await POST(new NextRequest("http://localhost/api/range/finance", { method: "POST", headers: { origin: "http://localhost", cookie: `${SESSION_COOKIE}=${coachId}` }, body: form }), { params: Promise.resolve({ path: ["finance"] }) })
        expect(response.status).toBe(500)
        expect(await prisma.rangeFinanceTransaction.count({ where: { locationId } })).toBe(before)
    })
    it("records fee coverage and its income atomically without duplicate retries", async () => {
        const body = { locationId, enrollmentId: studentIds[0], type: "admission", months: 3, coverageStart: "2026-11-12", coverageEnd: "2027-02-11", amountPaise: 1500000, occurredOn: rangeDay(), categoryId: incomeCategory, payments: [{ accountId: coachCash, method: "cash", amountPaise: 1500000 }], submissionKey: randomUUID() }
        const response = await call("fees", coachId, body)
        expect(response.status).toBe(200)
        const id = (await response.json()).transactionId
        expect((await (await call("fees", coachId, body)).json()).transactionId).toBe(id)
        expect(await prisma.rangeStudentFee.count({ where: { transactionId: id } })).toBe(1)
        expect((await prisma.rangeFinanceTransaction.findUniqueOrThrow({ where: { id } })).source).toBe("studentFee")
        expect((await call("fees", coachId, { ...body, months: 0, submissionKey: randomUUID() })).status).toBe(400)
        expect((await call(`fees?locationId=${otherLocationId}`, coachId)).status).toBe(403)
        expect((await call("finance/void", ownerId, { id, version: 1, reason: "Use fee flow" })).status).toBe(400)
        const corrected = await call("fees/correct", ownerId, { ...body, id, version: 1, months: 2, coverageEnd: "2027-01-11", reason: "Coverage agreed for two months", submissionKey: randomUUID() })
        expect(corrected.status).toBe(200)
        const replacementId = (await corrected.json()).transactionId
        expect((await prisma.rangeFinanceTransaction.findUniqueOrThrow({ where: { id } })).status).toBe("void")
        expect((await prisma.rangeStudentFee.findUniqueOrThrow({ where: { transactionId: replacementId } })).months).toBe(2)
        expect((await call("fees/void", coachId, { id: replacementId, version: 1, reason: "Not allowed" })).status).toBe(403)
        expect((await call("fees/void", ownerId, { id: replacementId, version: 1, reason: "Duplicate record confirmed" })).status).toBe(200)
    })
    it("requires owner confirmation and moves funds without creating income", async () => {
        expect((await call("finance", coachId, saleData({ payments: [{ accountId: coachCash, method: "cash", amountPaise: 95000 }] }))).status).toBe(200)
        const beforeIncome = (await prisma.rangeFinanceTransaction.aggregate({ where: { locationId, kind: "income", status: "posted" }, _sum: { amountPaise: true } }))._sum.amountPaise
        const body = { locationId, fromAccountId: coachCash, toAccountId: kartikCash, amountPaise: 95000, occurredOn: rangeDay(), notes: "Collected sale proceeds handed over", submissionKey: randomUUID() }
        const pending = await call("transfers", coachId, body)
        expect(pending.status).toBe(200)
        const id = (await pending.json()).transferId
        expect((await (await call("transfers", coachId, body)).json()).transferId).toBe(id)
        expect((await prisma.rangeTransfer.findUniqueOrThrow({ where: { id } })).transactionId).toBeNull()
        expect((await call("transfers/resolve", coachId, { id, version: 1, action: "confirm", reason: "Cannot self-confirm" })).status).toBe(403)
        const response = await call("transfers/resolve", ownerId, { id, version: 1, action: "confirm", reason: "Funds received" })
        expect(response.status).toBe(200)
        expect((await call("transfers/resolve", ownerId, { id, version: 1, action: "confirm", reason: "Retry" })).status).toBe(409)
        const transfer = await prisma.rangeTransfer.findUniqueOrThrow({ where: { id } })
        const movements = await prisma.rangeMoneyMovement.findMany({ where: { transactionId: transfer.transactionId! } })
        expect(movements.map(m => m.amountPaise).sort((a, b) => a - b)).toEqual([-95000, 95000])
        expect((await prisma.rangeFinanceTransaction.aggregate({ where: { locationId, kind: "income", status: "posted" }, _sum: { amountPaise: true } }))._sum.amountPaise).toBe(beforeIncome)
        expect((await call("transfers", coachId, { ...body, fromAccountId: kartikCash, toAccountId: coachCash, submissionKey: randomUUID() })).status).toBe(403)
        expect((await call("transfers", coachId, { ...body, confirmNow: true, submissionKey: randomUUID() })).status).toBe(403)
        expect((await call("transfers/resolve", ownerId, { id, version: transfer.version, action: "reverse", reason: "Correct mistaken handover record" })).status).toBe(200)
        expect((await prisma.rangeFinanceTransaction.findUniqueOrThrow({ where: { id: transfer.transactionId! } })).status).toBe("void")
    })
    it("records multiple salary payments once, keeps them private and corrects metadata with expenses", async () => {
        const data = { locationId, coachId, salaryMonth: rangeDay().slice(0, 7), amountPaise: 150000, occurredOn: rangeDay(), payments: [{ accountId: kartikCash, method: "cash", amountPaise: 150000 }], submissionKey: randomUUID() }
        expect((await call(`salaries?locationId=${locationId}`, coachId)).status).toBe(403)
        expect((await call("salaries", coachId, data)).status).toBe(403)
        expect((await call("salaries", ownerId, { ...data, salaryMonth: "2026-13" })).status).toBe(400)
        const response = await call("salaries", ownerId, data)
        expect(response.status).toBe(200)
        const firstId = (await response.json()).transactionId
        expect((await (await call("salaries", ownerId, data)).json()).transactionId).toBe(firstId)
        const second = await call("salaries", ownerId, { ...data, amountPaise: 200000, payments: [{ accountId: kartikCash, method: "cash", amountPaise: 200000 }], submissionKey: randomUUID() })
        expect(second.status).toBe(200)
        const secondId = (await second.json()).transactionId
        const paid = await prisma.rangeFinanceTransaction.aggregate({ where: { locationId, source: "salary", status: "posted" }, _sum: { amountPaise: true } })
        expect(paid._sum.amountPaise).toBe(350000)
        expect(await prisma.rangeSalaryPayment.count({ where: { coachId } })).toBe(2)
        expect((await (await call(`finance?locationId=${locationId}&id=${firstId}`, coachId)).json()).entries).toHaveLength(0)
        expect((await call(`finance/receipt?id=${firstId}`, coachId)).status).toBe(404)
        expect((await call("finance/void", ownerId, { id: firstId, version: 1, reason: "Salary has dedicated corrections" })).status).toBe(400)
        const replacement = await call("salaries/correct", ownerId, { ...data, id: firstId, version: 1, amountPaise: 100000, payments: [{ accountId: kartikCash, method: "cash", amountPaise: 100000 }], reason: "Actual first payment was ₹1000", submissionKey: randomUUID() })
        expect(replacement.status).toBe(200)
        expect((await prisma.rangeFinanceTransaction.findUniqueOrThrow({ where: { id: firstId } })).status).toBe("void")
        expect((await call("salaries/void", ownerId, { id: secondId, version: 1, reason: "Duplicate second record" })).status).toBe(200)
        expect((await prisma.rangeFinanceTransaction.aggregate({ where: { locationId, source: "salary", status: "posted" }, _sum: { amountPaise: true } }))._sum.amountPaise).toBe(100000)
    })
    it("keeps reporting owner-only and scopes coach overview financial data", async () => {
        expect((await call(`reports?locationId=${locationId}`, coachId)).status).toBe(403)
        expect((await call(`reports?locationId=${locationId}&export=1`, coachId)).status).toBe(403)
        expect((await call(`reports/meta?locationId=${locationId}`, coachId)).status).toBe(403)
        expect((await call(`dashboard?locationId=all`, coachId)).status).toBe(403)
        expect((await call(`reports?locationId=${locationId}`)).status).toBe(401)
        const coachOverview = await (await call(`dashboard?locationId=${locationId}`, coachId)).json()
        expect(coachOverview.accounts.every((a: { id: string }) => a.id === coachCash)).toBe(true)
        const expected = await prisma.rangeFinanceTransaction.aggregate({ where: { locationId, recordedById: coachId, status: "posted", kind: "expense", occurredOn: { gte: `${rangeDay().slice(0, 7)}-01`, lte: rangeDay() } }, _sum: { amountPaise: true } })
        expect(coachOverview.expensePaise).toBe(expected._sum.amountPaise || 0)
        expect((await call(`dashboard?locationId=${otherLocationId}`, coachId)).status).toBe(403)
    })
    it("filters payment-part totals correctly and exports the same matching records", async () => {
        expect((await call("finance", coachId, saleData({ description: "Split report test sale" }))).status).toBe(200)
        const query = `reports?locationId=${locationId}&report=finance&from=${rangeDay()}&to=${rangeDay()}&status=posted&accountId=${coachCash}&search=Split%20report%20test`
        const data = await (await call(query, ownerId)).json()
        expect(data.total).toBe(1)
        expect(data.summary.incomePaise).toBe(50000)
        expect(data.rows[0]["Transaction total (₹)"]).toBe(950)
        expect(data.rows[0]["Net movement in view (₹)"]).toBe(500)
        const response = await call(`${query}&export=1`, ownerId)
        expect(response.status).toBe(200)
        expect(response.headers.get("content-type")).toContain("spreadsheetml")
        const workbook = XLSX.read(await response.arrayBuffer(), { type: "array" })
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Records)
        expect(rows).toHaveLength(1)
        expect(rows[0]["Net movement in view (₹)"]).toBe(500)
        expect((await call(`reports?locationId=${locationId}&report=finance&status=invalid`, ownerId)).status).toBe(400)
        expect((await call(`reports?locationId=${locationId}&report=coachAttendance&accountId=${coachCash}`, ownerId)).status).toBe(400)
    })
    it("exports unmarked students as text without inventing absent records or Excel formulas", async () => {
        const created = await call("students", coachId, { locationId, name: "=1+1", guardianPhone: "9000000088", discipline: "pistol", startDate: rangeDay(), submissionKey: randomUUID() })
        expect(created.status).toBe(200)
        const id = (await created.json()).enrollmentId
        const response = await call(`reports?locationId=${locationId}&report=dailyRoll&status=unmarked&export=1`, ownerId)
        expect(response.status).toBe(200)
        const workbook = XLSX.read(await response.arrayBuffer(), { type: "array" }), sheet = workbook.Sheets.Records
        const row = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet).find(r => r.Student === "=1+1")
        expect(row?.Status).toBe("unmarked")
        const cell = Object.values(sheet).find(c => c && typeof c === "object" && "v" in c && c.v === "=1+1")
        expect(cell?.t).toBe("s")
        expect(cell?.f).toBeUndefined()
        expect(await prisma.rangeStudentAttendance.count({ where: { enrollmentId: id } })).toBe(0)
    })
    it("clips coach hours at India midnight and reports salary month independently of payment date", async () => {
        await prisma.rangeShift.create({ data: { userId: coachId, locationId, inAt: new Date("2026-10-03T23:00:00+05:30"), outAt: new Date("2026-10-04T01:00:00+05:30"), adjusted: true } })
        const attendance = await (await call(`reports?locationId=${locationId}&report=coachAttendance&from=2026-10-04&to=2026-10-04&personId=${coachId}&status=completed`, ownerId)).json()
        expect(attendance.total).toBe(1)
        expect(attendance.summary.completedHours).toBe(1)
        const salaries = await (await call(`reports?locationId=${locationId}&report=salaries&from=${rangeDay()}&to=${rangeDay()}&month=${rangeDay().slice(0, 7)}&personId=${coachId}&status=posted`, ownerId)).json()
        expect(salaries.total).toBe(1)
        expect(salaries.summary.expensePaise).toBe(100000)
        expect((await call(`reports?locationId=${locationId}&from=2026-10-10&to=2026-10-01`, ownerId)).status).toBe(400)
    })
    it("paginates audit history while exporting all matching pages and rejects oversized exports", async () => {
        await prisma.rangeAudit.createMany({ data: Array.from({ length: 55 }, (_, i) => ({ actorId: ownerId, locationId, action: "test.pagination", entityId: `row-${i}` })) })
        const query = `reports?locationId=${locationId}&report=audit&from=${rangeDay()}&to=${rangeDay()}&search=test.pagination`
        const first = await (await call(query, ownerId)).json(), second = await (await call(`${query}&page=2`, ownerId)).json()
        expect(first.total).toBe(55); expect(first.rows).toHaveLength(50); expect(second.rows).toHaveLength(5)
        const exported = await call(`${query}&page=2&export=1`, ownerId)
        const workbook = XLSX.read(await exported.arrayBuffer(), { type: "array" })
        expect(XLSX.utils.sheet_to_json(workbook.Sheets.Records)).toHaveLength(55)
        await prisma.rangeAudit.createMany({ data: Array.from({ length: 5001 }, (_, i) => ({ actorId: ownerId, locationId, action: "test.export.limit", entityId: `limit-${i}` })) })
        expect((await call(`reports?locationId=${locationId}&report=audit&search=test.export.limit&export=1`, ownerId)).status).toBe(413)
    })
    it("enforces the open-shift lock even for direct database writes", async () => {
        await expect(prisma.rangeShift.create({ data: { userId: coachId, locationId, inAt: new Date(), outAt: null, openKey: null } })).rejects.toThrow()
        const shift = await prisma.rangeShift.create({ data: { userId: coachId, locationId, inAt: new Date(), openKey: coachId } })
        try {
            await expect(prisma.rangeShift.create({ data: { userId: coachId, locationId: otherLocationId, inAt: new Date(), openKey: coachId } })).rejects.toThrow()
        } finally { await prisma.rangeShift.delete({ where: { id: shift.id } }) }
    })
})
