import { randomUUID } from "node:crypto"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { digest, hashPassword, SESSION_COOKIE } from "@/lib/range/auth"
import { financeRouteAccess, ownerOnly } from "@/lib/range/server"
import { rangeDay, type RangeActor } from "@/lib/range/shared"
import { suggestedCoverageEnd } from "@/lib/range/fee-period"
import { GET, POST } from "@/app/api/range/[...path]/route"

const actor: RangeActor = { id: "finance", name: "Finance", phone: null, role: "finance", mustChangePassword: false }
describe("finance role boundaries", () => {
    it("permits financial changes but never grants owner or training administration", () => {
        for (const path of ["finance", "finance/correct", "finance/void", "finance/settings", "finance/accounts/delete", "fees", "salaries", "transfers"]) expect(() => financeRouteAccess(actor, path, "POST")).not.toThrow()
        for (const path of ["staff", "locations", "students", "students/attendance", "training/accounts", "training/plans", "attendance/punch", "reports"]) expect(() => financeRouteAccess(actor, path, "POST")).toThrow()
        expect(() => ownerOnly(actor)).toThrow()
    })
})

const enabled = Boolean(process.env.TEST_DATABASE_URL), suffix = randomUUID(), prefix = `finance-access-${suffix}`
const masterId = `${prefix}-master`, coachId = `${prefix}-coach`, otherOwnerId = `${prefix}-owner`, locationId = `${prefix}-range`, outsideId = `${prefix}-outside`
const ids = [masterId, coachId, otherOwnerId]
const username = `fin-${suffix.slice(0, 12)}`, password = "Temporary finance passphrase!", personalPassword = "My finance account passphrase!"
const run = promisify(execFile), script = fileURLToPath(new URL("../scripts/range-finance-user.mjs", import.meta.url))
let financeId = "", financeToken = "", hash = "", accountId = "", secondAccount = "", categoryId = "", entryId = "", profileId = "", enrollmentId = ""
async function call(path: string, token: string, body?: unknown) {
    const request = new NextRequest(`http://localhost/api/range/${path}`, { method: body === undefined ? "GET" : "POST", headers: { origin: "http://localhost", "content-type": "application/json", cookie: `${SESSION_COOKIE}=${token}` }, body: body === undefined ? undefined : JSON.stringify(body) })
    return (body === undefined ? GET : POST)(request, { params: Promise.resolve({ path: path.split("?")[0].split("/") }) })
}
function provision() { return run(process.execPath, [script], { env: { ...process.env, RANGE_MASTER_ID: masterId, RANGE_FINANCE_USERNAME: username, RANGE_FINANCE_NAME: "Test Sachin", RANGE_FINANCE_PASSWORD_HASH: hash, RANGE_FINANCE_OPERATION: "provision" } }) }
function payment(patch: Record<string, unknown> = {}) { return { locationId, kind: "income", amountPaise: 10000, occurredOn: rangeDay(), categoryId, description: "Test direct income", payments: [{ accountId, amountPaise: 10000, method: "cash" }], submissionKey: randomUUID(), ...patch } }

describe.skipIf(!enabled)("finance staff and master activity against isolated PostgreSQL", () => {
    beforeAll(async () => {
        const url = new URL(process.env.TEST_DATABASE_URL!)
        if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) throw new Error("Use matching localhost DATABASE_URL and TEST_DATABASE_URL.")
        hash = await hashPassword(password)
        await prisma.rangeLocation.create({ data: { id: locationId, name: "Finance test range", slug: `${prefix}-a` } })
        for (const [id, role] of [[masterId, "owner"], [coachId, "coach"], [otherOwnerId, "owner"]]) {
            await prisma.rangeUser.create({ data: { id, username: `${id === masterId ? "master" : id === coachId ? "coach" : "other"}-${suffix.slice(0, 8)}`, name: id === masterId ? "Test Kartik" : id, role, passwordHash: hash, mustChangePassword: false, ...(role === "coach" ? { memberships: { create: { locationId } } } : {}) } })
            await prisma.rangeSession.create({ data: { userId: id, tokenHash: digest(id), expiresAt: new Date(Date.now() + 3600000) } })
        }
        await provision()
        const staff = await prisma.rangeUser.findUniqueOrThrow({ where: { username } })
        financeId = staff.id; ids.push(financeId)
        const login = await call("login", "", { identifier: username, password })
        financeToken = login.headers.get("set-cookie")!.match(/salvo-range-session=([^;]+)/)![1]
        await prisma.rangeLocation.create({ data: { id: outsideId, name: "Unassigned range", slug: `${prefix}-b` } })
    })
    afterAll(async () => {
        await prisma.rangeTransfer.deleteMany({ where: { locationId } })
        const entries = await prisma.rangeFinanceTransaction.findMany({ where: { locationId }, select: { id: true } })
        await prisma.rangeSalaryPayment.deleteMany({ where: { transactionId: { in: entries.map(item => item.id) } } })
        await prisma.rangeStudentFee.deleteMany({ where: { transactionId: { in: entries.map(item => item.id) } } })
        await prisma.rangeMoneyMovement.deleteMany({ where: { transactionId: { in: entries.map(item => item.id) } } })
        await prisma.rangeFinanceTransaction.updateMany({ where: { locationId }, data: { correctsId: null, refundOfId: null } })
        await prisma.rangeFinanceTransaction.deleteMany({ where: { locationId } })
        await prisma.rangeMoneyAccount.deleteMany({ where: { locationId } })
        await prisma.rangeFinanceCategory.deleteMany({ where: { locationId } })
        await prisma.rangeEnrollment.deleteMany({ where: { locationId } })
        if (profileId) await prisma.rangeShooterProfile.deleteMany({ where: { id: profileId } })
        await prisma.rangeAudit.deleteMany({ where: { actorId: { in: ids } } })
        await prisma.rangeAttendanceChallenge.deleteMany({ where: { userId: { in: ids } } })
        await prisma.rangeUser.deleteMany({ where: { id: { in: ids } } })
        await prisma.rangeLocation.deleteMany({ where: { id: { in: [locationId, outsideId] } } })
        await prisma.rangeLoginAttempt.deleteMany({ where: { phoneHash: digest(username) } })
        await prisma.$disconnect()
    })
    it("creates finance access, preserves Kartik’s credentials, and requires a first-login password change", async () => {
        expect(await prisma.rangeUser.findUnique({ where: { id: masterId } })).toMatchObject({ role: "owner", isMaster: true, passwordHash: hash, mustChangePassword: false })
        expect(await prisma.rangeUser.findUnique({ where: { id: financeId } })).toMatchObject({ role: "finance", isMaster: false, mustChangePassword: true })
        expect((await call("finance/meta?locationId=" + locationId, financeToken)).status).toBe(403)
        const changed = await call("password", financeToken, { currentPassword: password, password: personalPassword })
        expect(changed.status).toBe(200)
        financeToken = changed.headers.get("set-cookie")!.match(/salvo-range-session=([^;]+)/)![1]
        await provision()
        expect((await call("session", financeToken)).status).toBe(200)
        expect((await call("session", masterId)).status).toBe(200)
    }, 60000)
    it("rejects staff management, training, attendance, reports, and unassigned locations", async () => {
        for (const path of ["training/roster", `attendance?locationId=${locationId}`, `students/history?enrollmentId=anything`, `reports?locationId=${locationId}`, `finance/meta?locationId=${outsideId}`]) expect((await call(path, financeToken)).status).toBe(403)
        expect((await call("staff", financeToken, {})).status).toBe(403)
        const staff = await (await call("staff", financeToken)).json()
        expect(staff.staff.every((user: { role: string; passwordHash?: unknown; phone?: unknown }) => user.role === "coach" && !user.passwordHash && !user.phone)).toBe(true)
    })
    it("retains Kartik’s master controls and enables his coaching identity and self attendance", async () => {
        const choices = await (await call("training/assignments", masterId)).json()
        expect(choices.coaches.some((coach: { id: string }) => coach.id === masterId)).toBe(true)
        expect((await call("attendance/challenge", masterId, { locationId, action: "in" })).status).toBe(200)
        expect((await call("attendance/challenge", otherOwnerId, { locationId, action: "in" })).status).toBe(403)
    })
    it("records income, corrections and deletions immediately with audit history", async () => {
        for (const name of ["Direct cash", "Second cash"]) expect((await call("finance/settings", financeToken, { type: "account", locationId, name, custodian: "salvo", channel: "cash", openingPaise: 500000, openingDate: rangeDay() })).status).toBe(200)
        expect((await call("finance/settings", financeToken, { type: "category", locationId, name: "Test income", kind: "income" })).status).toBe(200)
        const meta = await (await call(`finance/meta?locationId=${locationId}`, financeToken)).json()
        accountId = meta.accounts.find((item: { name: string }) => item.name === "Direct cash").id
        secondAccount = meta.accounts.find((item: { name: string }) => item.name === "Second cash").id
        categoryId = meta.categories.find((item: { name: string }) => item.name === "Test income").id
        const posted = await call("finance", financeToken, payment())
        expect(posted.status).toBe(200)
        entryId = (await posted.json()).transactionId
        expect(await prisma.rangeFinanceTransaction.findUnique({ where: { id: entryId } })).toMatchObject({ status: "posted", recordedById: financeId })
        expect(await prisma.rangeCorrection.count({ where: { userId: financeId } })).toBe(0)
        expect((await call("finance/correct", financeToken, payment({ id: entryId, version: 1, reason: "Correct test receipt" }))).status).toBe(200)
        expect(await prisma.rangeFinanceTransaction.findUnique({ where: { id: entryId } })).toMatchObject({ status: "void" })
        expect((await call("finance/accounts/delete", financeToken, { locationId, id: secondAccount, version: 1, confirmName: "Second cash", reason: "Unused test account" })).status).toBe(200)
    })
    it("posts Sachin’s handovers directly even when an API caller omits confirmation", async () => {
        expect((await call("finance/settings", financeToken, { type: "account", locationId, name: "Transfer destination", custodian: "salvo", channel: "cash", openingPaise: 0, openingDate: rangeDay() })).status).toBe(200)
        secondAccount = (await (await call(`finance/meta?locationId=${locationId}`, financeToken)).json()).accounts.find((item: { name: string }) => item.name === "Transfer destination").id
        const response = await call("transfers", financeToken, { locationId, fromAccountId: accountId, toAccountId: secondAccount, amountPaise: 1000, occurredOn: rangeDay(), notes: "Direct finance handover", submissionKey: randomUUID(), confirmNow: false })
        expect(response.status).toBe(200)
        expect(await prisma.rangeTransfer.findUnique({ where: { id: (await response.json()).transferId } })).toMatchObject({ status: "confirmed", requestedById: financeId })
    })
    it("allows fee and salary records directly", async () => {
        const profile = await prisma.rangeShooterProfile.create({ data: { name: "Finance test student" } }); profileId = profile.id
        const enrollment = await prisma.rangeEnrollment.create({ data: { profileId, locationId, discipline: "pistol", startDate: rangeDay(), createdById: coachId, submissionKey: randomUUID(), submissionHash: "test" } }); enrollmentId = enrollment.id
        expect((await call("fees", financeToken, payment({ enrollmentId, type: "admission", months: 1, coverageStart: rangeDay(), coverageEnd: suggestedCoverageEnd(rangeDay(), 1) }))).status).toBe(200)
        expect((await call("salaries", financeToken, payment({ coachId, salaryMonth: rangeDay().slice(0, 7) }))).status).toBe(200)
        const roster = await (await call(`students?locationId=${locationId}`, financeToken)).json()
        expect(roster.students[0].attendance).toBeUndefined()
    })
    it("notifies only Kartik about every financial action, with before/after history and independent read state", async () => {
        for (const token of [financeToken, coachId, otherOwnerId]) expect((await call("financial-activity", token)).status).toBe(403)
        const response = await call("financial-activity?all=1", masterId)
        expect(response.status).toBe(200)
        const inbox = await response.json()
        expect(inbox.updates.some((update: { action: string }) => update.action === "finance.account.deleted")).toBe(true)
        expect(inbox.updates.some((update: { action: string }) => update.action === "salary.recorded")).toBe(true)
        expect(inbox.updates.some((update: { action: string }) => update.action === "fee.recorded")).toBe(true)
        expect(inbox.updates.some((update: { action: string }) => update.action === "transfer.confirmed")).toBe(true)
        expect(inbox.updates.some((update: { actor: { name: string } }) => update.actor.name === "Test Sachin")).toBe(true)
        const before = await prisma.rangeFinanceTransaction.findUnique({ where: { id: entryId } })
        expect((await call("financial-activity", masterId, { ids: inbox.updates.map((update: { id: string }) => update.id) })).status).toBe(200)
        expect((await (await call("financial-activity?countOnly=1", masterId)).json()).unreadCount).toBe(0)
        expect(await prisma.rangeFinanceTransaction.findUnique({ where: { id: entryId } })).toEqual(before)
    })
})
