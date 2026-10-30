import { randomUUID } from "node:crypto"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { digest, hashPassword, SESSION_COOKIE } from "@/lib/range/auth"
import { GET, POST } from "@/app/api/range/[...path]/route"
import { rangeDay } from "@/lib/range/shared"
import { v2 as cloudinary } from "cloudinary"

vi.mock("cloudinary", () => ({ v2: { config: vi.fn(), uploader: { upload_stream: vi.fn((options: { public_id: string }, callback: (error: Error | null, result?: unknown) => void) => ({ end: (bytes: Uint8Array) => process.env.TRAINING_TEST_UPLOAD_OK === "1" ? callback(null, { public_id: options.public_id, format: "png", resource_type: "image", bytes: bytes.length }) : callback(new Error("Storage offline")) })), destroy: vi.fn(async () => ({ result: "ok" })) }, utils: { private_download_url: vi.fn(() => "https://example.test/expiring-private-file") } } }))

const enabled = Boolean(process.env.TEST_DATABASE_URL), prefix = `training-${randomUUID()}`
const owner = `${prefix}-owner`, coach = `${prefix}-coach`, second = `${prefix}-second`, unrelated = `${prefix}-unrelated`
const profile = `${prefix}-p1`, sibling = `${prefix}-p2`, today = rangeDay(), past = "2026-01-01"
const staffIds = [owner, coach, second, unrelated], accountIds: string[] = []
let student = "", otherStudent = "", planId = "", sessionId = "", otherSessionId = "", reviewVersion = 0
function request(path: string, token?: string, body?: unknown) {
    return new NextRequest(`http://localhost/api/range/${path}`, { method: body === undefined ? "GET" : "POST", headers: { origin: "http://localhost", "content-type": "application/json", ...(token ? { cookie: `${SESSION_COOKIE}=${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
}
function call(path: string, token?: string, body?: unknown) {
    return (body === undefined ? GET : POST)(request(path, token, body), { params: Promise.resolve({ path: path.split("?")[0].split("/") }) })
}
const keyed = (body: Record<string, unknown>) => ({ ...body, submissionKey: randomUUID() })
function sessionBody(overrides: Record<string, unknown> = {}) { return { date: today, label: "Morning", discipline: "pistol", notes: "Sight alignment", durationMinutes: 30, shotCount: 40, score: 300, maximumScore: 400, attachmentIds: [], version: 0, ...overrides } }
async function assignments(coachIds: string[], profileId = profile) {
    const p = await prisma.rangeShooterProfile.findUniqueOrThrow({ where: { id: profileId } })
    return call("training/assignments", owner, keyed({ profileId, version: p.trainingVersion, coachIds }))
}

describe.skipIf(!enabled)("student training APIs against isolated PostgreSQL", () => {
    beforeAll(async () => {
        const url = new URL(process.env.TEST_DATABASE_URL!)
        if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) throw new Error("Training tests require matching localhost DATABASE_URL and TEST_DATABASE_URL.")
        const passwordHash = await hashPassword("Temporary test password!")
        for (const id of staffIds) {
            await prisma.rangeUser.create({ data: { id, username: `t${randomUUID().replaceAll("-", "").slice(0, 25)}`, name: id === coach ? "Coach One" : id === second ? "Coach Two" : "Test staff", role: id === owner ? "owner" : "coach", passwordHash, mustChangePassword: false } })
            await prisma.rangeSession.create({ data: { tokenHash: digest(id), userId: id, expiresAt: new Date(Date.now() + 3600000) } })
        }
        await prisma.rangeShooterProfile.createMany({ data: [{ id: profile, name: "Sibling One", guardianPhone: "+919876543210" }, { id: sibling, name: "Sibling Two", guardianPhone: "+919876543210" }] })
    })
    afterAll(async () => {
        const ids = [...staffIds, ...accountIds]
        const sessions = await prisma.rangeTrainingSession.findMany({ where: { profileId: { in: [profile, sibling] } }, select: { id: true } }), sessionIds = sessions.map(item => item.id)
        const reviews = await prisma.rangeTrainingReview.findMany({ where: { sessionId: { in: sessionIds } }, select: { id: true } })
        await prisma.rangeTrainingReviewRevision.deleteMany({ where: { reviewId: { in: reviews.map(item => item.id) } } })
        await prisma.rangeTrainingReview.deleteMany({ where: { sessionId: { in: sessionIds } } })
        await prisma.rangeTrainingSessionRevision.deleteMany({ where: { sessionId: { in: sessionIds } } })
        await prisma.rangeTrainingSession.deleteMany({ where: { id: { in: sessionIds } } })
        const plans = await prisma.rangeTrainingPlan.findMany({ where: { profileId: { in: [profile, sibling] } } })
        await prisma.rangeTrainingPlanRevision.deleteMany({ where: { planId: { in: plans.map(item => item.id) } } })
        await prisma.rangeTrainingPlan.deleteMany({ where: { profileId: { in: [profile, sibling] } } })
        await prisma.rangeTrainingCoach.deleteMany({ where: { profileId: { in: [profile, sibling] } } })
        await prisma.rangeTrainingMedia.deleteMany({ where: { ownerId: { in: ids } } })
        await prisma.rangeTrainingSubmission.deleteMany({ where: { actorId: { in: ids } } })
        await prisma.rangeAudit.deleteMany({ where: { actorId: { in: ids } } })
        await prisma.rangeUser.deleteMany({ where: { id: { in: ids } } })
        await prisma.rangeShooterProfile.deleteMany({ where: { id: { in: [profile, sibling] } } })
        await prisma.$disconnect()
    })
    it("creates explicit username accounts for siblings sharing a guardian phone and gates temporary passwords", async () => {
        for (const profileId of [profile, sibling]) {
            const body = keyed({ profileId, username: `s${randomUUID().replaceAll("-", "").slice(0, 25)}`, password: "Temporary test password!", version: 0, active: true })
            const response = await call("training/accounts", owner, body)
            expect(response.status).toBe(200)
            const { account } = await response.json(); accountIds.push(account.id)
            expect((await (await call("training/accounts", owner, body)).json()).account.id).toBe(account.id)
            if (profileId === profile) student = account.id; else otherStudent = account.id
            await prisma.rangeSession.create({ data: { tokenHash: digest(account.id), userId: account.id, expiresAt: new Date(Date.now() + 3600000) } })
            expect((await call("training/roster", account.id)).status).toBe(403)
            const changed = await call("password", account.id, { currentPassword: "Temporary test password!", password: "Personal test password!" })
            expect(changed.status).toBe(200)
            await prisma.rangeSession.create({ data: { tokenHash: digest(account.id), userId: account.id, expiresAt: new Date(Date.now() + 3600000) } })
        }
        const session = await (await call("session", student)).json()
        expect(session.user.shooterProfileId).toBe(profile)
        expect(session.locations).toEqual([])
        expect(session.user.passwordHash).toBeUndefined()
        expect((await call("training/accounts", coach, keyed({}))).status).toBe(403)
    })
    it("blocks every staff operational API for students and keeps staff administration separate", async () => {
        for (const path of ["students", "students/history", "attendance", "finance", "finance/meta", "fees", "transfers", "salaries", "reports", "dashboard", "staff", "locations", "corrections"]) expect((await call(path, student)).status, path).toBe(403)
        const staff = await (await call("staff", owner)).json()
        expect(staff.staff.some((user: { id: string }) => user.id === student)).toBe(false)
        expect((await call("training/roster")).status).toBe(401)
    })
    it("supports multiple assigned coaches and denies unrelated coaches even with valid logins", async () => {
        expect((await assignments([coach, second])).status).toBe(200)
        expect((await assignments([coach], sibling)).status).toBe(200)
        const ownRoster = await (await call("training/roster", coach)).json()
        expect(ownRoster.students.map((item: { id: string }) => item.id)).toEqual(expect.arrayContaining([profile, sibling]))
        expect((await call(`training/sessions?profileId=${profile}`, unrelated)).status).toBe(403)
        expect((await call(`training/analytics?profileId=${sibling}`, student)).status).toBe(403)
        expect((await call("training/assignments", coach)).status).toBe(403)
        expect((await assignments([student])).status).toBe(400)
    })
    it("previews and creates common plans atomically, with retry protection and per-student customization", async () => {
        const preview = await (await call("training/plans/preview", coach, { date: today, profileIds: [profile, sibling] })).json()
        expect(preview.rows).toHaveLength(2)
        expect(preview.rows.every((row: { plan: unknown }) => row.plan === null)).toBe(true)
        const body = keyed({ date: today, rows: [profile, sibling].map(profileId => ({ profileId, version: 0, title: "Daily plan", instructions: profileId === profile ? "Alignment drills" : "Custom breathing drills", attachmentIds: [], replace: false })) })
        expect((await call("training/plans", coach, body)).status).toBe(200)
        expect((await call("training/plans", coach, body)).status).toBe(200)
        expect(await prisma.rangeTrainingPlan.count({ where: { profileId: { in: [profile, sibling] }, date: today } })).toBe(2)
        planId = (await prisma.rangeTrainingPlan.findUniqueOrThrow({ where: { profileId_date: { profileId: profile, date: today } } })).id
        expect((await call("training/plans", student, body)).status).toBe(403)
    })
    it("requires explicit replacement and rejects a stale preview without changing any plans", async () => {
        const row = { profileId: profile, version: 1, title: "Updated", instructions: "Updated drills", attachmentIds: [], replace: false }
        expect((await call("training/plans", second, keyed({ date: today, rows: [row] }))).status).toBe(409)
        expect((await call("training/plans", second, keyed({ date: today, rows: [{ ...row, replace: true }] }))).status).toBe(200)
        const stale = keyed({ date: today, rows: [{ ...row, replace: true }, { ...row, profileId: sibling, version: 1, replace: true }] })
        expect((await call("training/plans", coach, stale)).status).toBe(409)
        expect((await prisma.rangeTrainingPlan.findUniqueOrThrow({ where: { profileId_date: { profileId: sibling, date: today } } })).version).toBe(1)
        expect((await (await call(`training/plans/history?id=${planId}`, student)).json()).revisions).toHaveLength(2)
    })
    it("attaches one staged document to multiple plans and consumes it only once", async () => {
        const asset = await prisma.rangeTrainingMedia.create({ data: { ownerId: coach, publicId: `${prefix}-shared`, purpose: "plan", name: "Shared.pdf", mimeType: "application/pdf", format: "pdf", resourceType: "image", bytes: 100, expiresAt: new Date(Date.now() + 3600000) } })
        const body = keyed({ date: "2099-01-01", rows: [profile, sibling].map(profileId => ({ profileId, version: 0, title: "Common document", instructions: "", attachmentIds: [asset.id], replace: false })) })
        expect((await call("training/plans", coach, body)).status).toBe(200)
        expect((await prisma.rangeTrainingMedia.findUniqueOrThrow({ where: { id: asset.id } })).expiresAt).toBeNull()
        expect(await prisma.rangeTrainingPlanRevision.count({ where: { attachments: { some: { id: asset.id } } } })).toBe(2)
        expect((await call("training/plans", coach, body)).status).toBe(200)
    })
    it("allows multiple daily and backdated sessions, including sessions with no plan", async () => {
        const body = keyed(sessionBody())
        const response = await call("training/sessions", student, body)
        expect(response.status).toBe(200)
        sessionId = (await response.json()).session.id
        expect((await (await call("training/sessions", student, body)).json()).session.id).toBe(sessionId)
        const afternoon = await call("training/sessions", student, keyed(sessionBody({ label: "Afternoon", score: 0, maximumScore: 100 })))
        expect(afternoon.status).toBe(200); otherSessionId = (await afternoon.json()).session.id
        expect((await call("training/sessions", student, keyed(sessionBody({ date: past, discipline: "general", score: null, maximumScore: null, label: "Fitness" })))).status).toBe(200)
        expect((await call("training/sessions", student, keyed(sessionBody({ date: "2099-01-01" })))).status).toBe(400)
        expect((await call("training/sessions", coach, keyed(sessionBody()))).status).toBe(403)
        expect((await call("training/sessions", otherStudent, keyed(sessionBody({ id: sessionId, version: 1 })))).status).toBe(404)
    })
    it("preserves the linked plan and reviewed content after both plan edits and diary edits", async () => {
        const review = await call("training/reviews", coach, keyed({ sessionId, version: 0, sessionVersion: 1, remarks: "Good alignment", reviewed: true }))
        expect(review.status).toBe(200); reviewVersion = (await review.json()).review.version
        expect((await call("training/reviews", second, keyed({ sessionId, version: 0, sessionVersion: 1, remarks: "Keep your follow-through", reviewed: true }))).status).toBe(200)
        expect((await call("training/plans", coach, keyed({ date: today, rows: [{ profileId: profile, version: 2, title: "Later plan", instructions: "New work", attachmentIds: [], replace: true }] }))).status).toBe(200)
        expect((await call("training/sessions", student, keyed(sessionBody({ id: sessionId, version: 1, notes: "Updated reflection", score: 360 })))).status).toBe(200)
        const history = await (await call(`training/sessions/history?id=${sessionId}`, coach)).json()
        expect(history.revisions).toHaveLength(2)
        expect(history.revisions[1].notes).toBe("Sight alignment")
        expect(history.revisions[0].planRevision.version).toBe(2)
        expect(history.reviews).toHaveLength(2)
        expect(history.reviews.every((item: { sessionVersion: number }) => item.sessionVersion === 1)).toBe(true)
        const changed = await (await call(`training/sessions?profileId=${profile}&review=changed`, coach)).json()
        expect(changed.sessions.map((item: { id: string }) => item.id)).toContain(sessionId)
        expect((await call("training/reviews", coach, keyed({ sessionId, version: reviewVersion, sessionVersion: 1, remarks: "Stale", reviewed: true }))).status).toBe(409)
    })
    it("keeps remark history, supports re-review, and uses only current scores in analytics", async () => {
        expect((await call("training/reviews", coach, keyed({ sessionId, version: reviewVersion, sessionVersion: 2, remarks: "Reviewed your correction", reviewed: true }))).status).toBe(200)
        const history = await (await call(`training/sessions/history?id=${sessionId}`, student)).json()
        expect(history.reviews.find((item: { coachId: string }) => item.coachId === coach).revisions).toHaveLength(2)
        const data = await (await call(`training/analytics?profileId=${profile}&from=${today}&to=${today}`, coach)).json()
        expect(data.summary.sessions).toBe(2)
        expect(data.summary.percentage).toBe(72)
        expect(data.records.filter((item: { id: string }) => item.id === sessionId)).toHaveLength(1)
        expect((await call("training/reviews", student, keyed({}))).status).toBe(403)
    })
    it("authorizes attached files by current assignments, including old revisions", async () => {
        const asset = await prisma.rangeTrainingMedia.create({ data: { ownerId: coach, publicId: `${prefix}-plan`, purpose: "plan", name: "Plan.pdf", mimeType: "application/pdf", format: "pdf", resourceType: "image", bytes: 100 } })
        const revision = await prisma.rangeTrainingPlanRevision.findFirstOrThrow({ where: { planId, version: 1 } })
        await prisma.rangeTrainingPlanRevision.update({ where: { id: revision.id }, data: { attachments: { connect: { id: asset.id } } } })
        process.env.CLOUDINARY_CLOUD_NAME = "test"; process.env.CLOUDINARY_API_KEY = "test"; process.env.CLOUDINARY_API_SECRET = "test"
        expect((await call(`training/media?id=${asset.id}`, student)).status).toBe(200)
        const opened = await call(`training/media?id=${asset.id}&open=1`, student)
        expect(opened.status).toBe(307)
        expect(opened.headers.get("location")).toBe("https://example.test/expiring-private-file")
        expect(opened.headers.get("cache-control")).toBe("private, no-store")
        const urlOptions = vi.mocked(cloudinary.utils.private_download_url).mock.calls.at(-1)?.[2]
        expect(urlOptions?.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000))
        expect(urlOptions?.expires_at).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 60)
        expect((await call(`training/media?id=${asset.id}`, unrelated)).status).toBe(403)
        expect((await call(`training/media?id=${asset.id}`, otherStudent)).status).toBe(403)
        const retry = keyed({ date: "2099-02-01", rows: [{ profileId: profile, version: 0, title: "Retry access check", instructions: "Practice", attachmentIds: [], replace: false }] })
        expect((await call("training/plans", coach, retry)).status).toBe(200)
        expect((await assignments([second])).status).toBe(200)
        expect((await call("training/plans", coach, retry)).status).toBe(403)
        for (const path of [`training/media?id=${asset.id}`, `training/sessions/history?id=${sessionId}`, `training/plans/history?id=${planId}`, `training/analytics?profileId=${profile}`]) expect((await call(path, coach)).status, path).toBe(403)
        expect((await call(`training/sessions/history?id=${sessionId}`, second)).status).toBe(200)
        expect((await assignments([coach, second])).status).toBe(200)
    })
    it("rejects stale session updates, unowned attachments, and duplicated attachment IDs", async () => {
        expect((await call("training/sessions", student, keyed(sessionBody({ id: sessionId, version: 1 })))).status).toBe(409)
        expect((await call("training/sessions", student, keyed(sessionBody({ attachmentIds: ["missing"] })))).status).toBe(409)
        expect((await call("training/sessions", student, keyed(sessionBody({ attachmentIds: ["same", "same"] })))).status).toBe(400)
        expect((await call(`training/sessions/history?id=${otherSessionId}`, otherStudent)).status).toBe(403)
        const foreign = await prisma.rangeTrainingMedia.create({ data: { ownerId: otherStudent, publicId: `${prefix}-foreign`, purpose: "target", name: "Target.jpg", mimeType: "image/jpeg", format: "jpg", resourceType: "image", bytes: 100, expiresAt: new Date(Date.now() + 3600000) } })
        expect((await call("training/sessions", student, keyed(sessionBody({ attachmentIds: [foreign.id] })))).status).toBe(409)
        const expired = await prisma.rangeTrainingMedia.create({ data: { ownerId: student, publicId: `${prefix}-expired`, purpose: "target", name: "Expired.jpg", mimeType: "image/jpeg", format: "jpg", resourceType: "image", bytes: 100, expiresAt: new Date(Date.now() - 3600000) } })
        expect((await call(`training/media?id=${expired.id}`, student)).status).toBe(403)
        expect((await call("training/sessions", student, keyed(sessionBody({ attachmentIds: [expired.id] })))).status).toBe(409)
    })
    it("cleans abandoned uploads and leaves no file record when storage fails", async () => {
        const before = await prisma.rangeTrainingMedia.count({ where: { ownerId: student } })
        const form = new FormData(); form.set("purpose", "target"); form.set("file", new File([new Uint8Array([255, 216, 255, 1])], "Target.jpg", { type: "image/jpeg" }))
        const req = new NextRequest("http://localhost/api/range/training/media", { method: "POST", headers: { origin: "http://localhost", cookie: `${SESSION_COOKIE}=${student}` }, body: form })
        const response = await POST(req, { params: Promise.resolve({ path: ["training", "media"] }) })
        expect(response.status).toBe(503)
        expect(await prisma.rangeTrainingMedia.count({ where: { ownerId: student } })).toBe(before - 1)
        expect(vi.mocked(cloudinary.uploader.destroy)).toHaveBeenCalled()
    })
    it("uploads a student's target and retains it in earlier session revisions after removal", async () => {
        process.env.TRAINING_TEST_UPLOAD_OK = "1"
        try {
            const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1UAAAAASUVORK5CYII=", "base64")
            const form = new FormData(); form.set("purpose", "target"); form.set("file", new File([image], "Target.png", { type: "image/png" }))
            const req = new NextRequest("http://localhost/api/range/training/media", { method: "POST", headers: { origin: "http://localhost", cookie: `${SESSION_COOKIE}=${student}` }, body: form })
            const upload = await POST(req, { params: Promise.resolve({ path: ["training", "media"] }) })
            expect(upload.status).toBe(200)
            const { asset } = await upload.json()
            const response = await call("training/sessions", student, keyed(sessionBody({ label: "Target session", attachmentIds: [asset.id] })))
            expect(response.status).toBe(200)
            const { session } = await response.json()
            expect((await call(`training/media?id=${asset.id}`, coach)).status).toBe(200)
            expect((await call("training/sessions", student, keyed(sessionBody({ id: session.id, version: 1, label: "Target session" })))).status).toBe(200)
            const history = await (await call(`training/sessions/history?id=${session.id}`, coach)).json()
            expect(history.revisions[0].attachments).toHaveLength(0)
            expect(history.revisions[1].attachments[0].id).toBe(asset.id)
            expect((await call(`training/media?id=${asset.id}`, student)).status).toBe(200)
        } finally { delete process.env.TRAINING_TEST_UPLOAD_OK }
    })
    it("rejects one of two simultaneous edits rather than silently overwriting", async () => {
        const responses = await Promise.all(["First reflection", "Second reflection"].map(notes => call("training/sessions", student, keyed(sessionBody({ id: sessionId, version: 2, score: 360, notes })))))
        expect(responses.map(response => response.status).sort()).toEqual([200, 409])
        expect(await prisma.rangeTrainingSessionRevision.count({ where: { sessionId } })).toBe(3)
    })
    it("revokes all student sessions on password reset and deactivation", async () => {
        const account = await prisma.rangeUser.findUniqueOrThrow({ where: { id: student } })
        expect((await call("training/accounts", owner, keyed({ profileId: profile, version: account.version, username: account.username, password: "Another temporary password!", active: true }))).status).toBe(200)
        expect((await call("session", student)).status).toBe(401)
        await prisma.rangeSession.create({ data: { tokenHash: digest(student), userId: student, expiresAt: new Date(Date.now() + 3600000) } })
        expect((await call("training/roster", student)).status).toBe(403)
        expect((await call("training/accounts", owner, keyed({ profileId: profile, version: account.version + 1, username: account.username, active: false }))).status).toBe(200)
        expect((await call("session", student)).status).toBe(401)
        const audits = await prisma.rangeAudit.findMany({ where: { entityId: student } })
        expect(JSON.stringify(audits)).not.toContain("passwordHash")
        expect(JSON.stringify(audits)).not.toContain("Another temporary")
    })
})
