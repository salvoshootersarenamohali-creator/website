import { randomBytes, randomUUID, scryptSync } from "node:crypto"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { digest, hashPassword, SESSION_COOKIE, verifyPassword } from "@/lib/range/auth"
import { GET, POST } from "@/app/api/range/[...path]/route"

const enabled = Boolean(process.env.TEST_DATABASE_URL)
const suffix = randomUUID().slice(0, 8)
const username = `onboard-${suffix}`, oldUsername = `existing-${suffix}`, coachUsername = `coach-${suffix}`
const usernames = [username, oldUsername, coachUsername]
const newPassword = "My new owner passphrase!"
const salt = randomBytes(16).toString("hex")
const temporaryHash = `scrypt$${salt}$${scryptSync("abc", salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }).toString("hex")}`
const runFile = promisify(execFile)
const script = fileURLToPath(new URL("../scripts/range-owner.mjs", import.meta.url))
let oldPasswordHash = "", session = ""

function provision(patch: Record<string, string> = {}) {
    return runFile(process.execPath, [script], { env: { ...process.env, RANGE_OWNER_NAME: "Additional owner", RANGE_OWNER_USERNAME: username, RANGE_OWNER_PHONE: "", RANGE_OWNER_PASSWORD: "", RANGE_OWNER_PASSWORD_HASH: temporaryHash, RANGE_OWNER_TEMPORARY: "true", RANGE_OWNER_CREATE_ONLY: "true", ...patch } })
}
async function call(path: string, body?: unknown, token?: string) {
    const request = new NextRequest(`http://localhost/api/range/${path}`, { method: body === undefined ? "GET" : "POST", headers: { origin: "http://localhost", "content-type": "application/json", "x-forwarded-for": `onboarding-${suffix}`, ...(token ? { cookie: `${SESSION_COOKIE}=${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
    return (body === undefined ? GET : POST)(request, { params: Promise.resolve({ path: path.split("/") }) })
}
function token(response: Response) { return response.headers.get("set-cookie")?.match(/salvo-range-session=([^;]+)/)?.[1] || "" }

describe.skipIf(!enabled)("additional owner onboarding against isolated PostgreSQL", () => {
    beforeAll(async () => {
        const url = new URL(process.env.TEST_DATABASE_URL!)
        if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) throw new Error("Owner onboarding tests require matching localhost DATABASE_URL and TEST_DATABASE_URL.")
        oldPasswordHash = await hashPassword("Existing owner password!")
        await prisma.rangeUser.createMany({ data: [{ name: "Existing owner", username: oldUsername, role: "owner", passwordHash: oldPasswordHash, mustChangePassword: false }, { name: "Coach", username: coachUsername, role: "coach", passwordHash: oldPasswordHash, mustChangePassword: false }] })
    })
    afterAll(async () => {
        const users = await prisma.rangeUser.findMany({ where: { username: { in: usernames } }, select: { id: true } })
        await prisma.rangeAudit.deleteMany({ where: { actorId: { in: users.map(user => user.id) } } })
        await prisma.rangeUser.deleteMany({ where: { username: { in: usernames } } })
        await prisma.rangeLoginAttempt.deleteMany({ where: { ipHash: digest(`onboarding-${suffix}`) } })
        await prisma.$disconnect()
    })
    it("creates a separate username owner and requires a new password before owner access", async () => {
        expect((await provision()).stdout).toContain("password change is required")
        const added = await prisma.rangeUser.findUniqueOrThrow({ where: { username } })
        expect(added).toMatchObject({ role: "owner", active: true, mustChangePassword: true, phone: null })
        expect(await verifyPassword("abc", added.passwordHash)).toBe(true)
        expect(await prisma.rangeUser.findUnique({ where: { username: oldUsername } })).toMatchObject({ passwordHash: oldPasswordHash, mustChangePassword: false, role: "owner" })
        const login = await call("login", { identifier: ` ${username.toUpperCase()} `, password: "abc" })
        expect(login.status).toBe(200)
        const temporarySession = token(login)
        expect(temporarySession).not.toBe("")
        expect((await login.json()).user).toMatchObject({ username, role: "owner", mustChangePassword: true })
        expect((await call("staff", undefined, temporarySession)).status).toBe(403)
        expect((await call("locations", undefined, temporarySession)).status).toBe(403)
        expect((await call("session", undefined, temporarySession)).status).toBe(200)
        expect((await call("password", { currentPassword: "wrong", password: newPassword }, temporarySession)).status).toBe(403)
        expect((await call("password", { currentPassword: "abc", password: "abc" }, temporarySession)).status).toBe(400)
        const changed = await call("password", { currentPassword: "abc", password: newPassword }, temporarySession)
        expect(changed.status).toBe(200)
        expect((await changed.json()).user.mustChangePassword).toBe(false)
        session = token(changed)
        expect(session).not.toBe(temporarySession)
        expect((await call("session", undefined, temporarySession)).status).toBe(401)
        expect((await call("staff", undefined, session)).status).toBe(200)
        expect((await call("login", { identifier: username, password: "abc" })).status).toBe(401)
        const subsequent = await call("login", { identifier: username, password: newPassword })
        expect(subsequent.status).toBe(200)
        expect((await subsequent.json()).user.mustChangePassword).toBe(false)
        const audits = await prisma.rangeAudit.findMany({ where: { actorId: added.id } })
        expect(audits.map(audit => audit.action)).toEqual(expect.arrayContaining(["owner.created", "password.changed"]))
        expect(JSON.stringify(audits)).not.toContain("scrypt$")
    })
    it("preserves the changed password and live sessions when provisioning is repeated", async () => {
        expect((await provision()).stdout).toContain("password and sessions have been preserved")
        const user = await prisma.rangeUser.findUniqueOrThrow({ where: { username } })
        expect(user.mustChangePassword).toBe(false)
        expect(await verifyPassword(newPassword, user.passwordHash)).toBe(true)
        expect(await verifyPassword("abc", user.passwordHash)).toBe(false)
        expect((await call("session", undefined, session)).status).toBe(200)
        expect(await prisma.rangeAudit.count({ where: { actorId: user.id, action: "owner.created" } })).toBe(1)
    })
    it("refuses to promote an existing coach or accept a permanent short password", async () => {
        await expect(provision({ RANGE_OWNER_USERNAME: coachUsername })).rejects.toMatchObject({ code: 1 })
        expect(await prisma.rangeUser.findUnique({ where: { username: coachUsername } })).toMatchObject({ role: "coach", passwordHash: oldPasswordHash })
        await expect(provision({ RANGE_OWNER_PASSWORD_HASH: "", RANGE_OWNER_PASSWORD: "abc", RANGE_OWNER_TEMPORARY: "false" })).rejects.toMatchObject({ code: 1 })
    })
    it("shares the username rate limit across case and surrounding whitespace", async () => {
        const missing = `missing-${suffix}`
        for (let i = 0; i < 5; i++) expect((await call("login", { identifier: i % 2 ? ` ${missing.toUpperCase()} ` : missing, password: "wrong" })).status).toBe(401)
        expect((await call("login", { identifier: missing, password: "wrong" })).status).toBe(429)
    })
})
