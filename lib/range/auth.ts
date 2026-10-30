import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { loginIdentity, normalizePhone, RangeActor, RangeError, textField } from "./shared"
import { audit, jsonBody, ownerOnly, transaction } from "./server"

export const SESSION_COOKIE = "salvo-range-session"
const SESSION_SECONDS = 7 * 24 * 60 * 60
const publicUser = { id: true, name: true, phone: true, username: true, role: true, active: true, mustChangePassword: true, memberships: { select: { locationId: true } } } as const
export function digest(value: string) { return createHash("sha256").update(value).digest("hex") }
export function validatePassword(value: unknown): asserts value is string {
    if (typeof value !== "string" || value.length < 12 || value.length > 128) throw new RangeError("Use a password of 12 to 128 characters.")
}
function derive(password: string, salt: string) {
    return new Promise<Buffer>((resolve, reject) => scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)))
}
export async function hashPassword(password: string) {
    validatePassword(password)
    const salt = randomBytes(16).toString("hex")
    return `scrypt$${salt}$${(await derive(password, salt)).toString("hex")}`
}
export async function verifyPassword(password: string, stored: string) {
    const [algorithm, salt, expected] = stored.split("$")
    if (algorithm !== "scrypt" || !salt || !/^[a-f0-9]{128}$/.test(expected ?? "")) return false
    return timingSafeEqual(await derive(password, salt), Buffer.from(expected, "hex"))
}
export async function currentActor(request: NextRequest): Promise<RangeActor> {
    const token = request.cookies.get(SESSION_COOKIE)?.value
    if (!token) throw new RangeError("Please sign in.", 401)
    const session = await prisma.rangeSession.findUnique({ where: { tokenHash: digest(token) }, include: { user: true } })
    if (!session || session.expiresAt <= new Date() || !session.user.active) throw new RangeError("Your session has expired. Please sign in.", 401)
    return { id: session.user.id, name: session.user.name, phone: session.user.phone, username: session.user.username, shooterProfileId: session.user.shooterProfileId, role: session.user.role, mustChangePassword: session.user.mustChangePassword }
}
function sessionResponse(token: string, actor: RangeActor) {
    const response = NextResponse.json({ user: actor })
    response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_SECONDS })
    return response
}
export async function login(request: NextRequest) {
    const body = await jsonBody(request)
    const identity = loginIdentity(body.identifier ?? body.phone)
    const password = typeof body.password === "string" && body.password.length <= 128 ? body.password : ""
    const phoneHash = digest("phone" in identity ? identity.phone : identity.username)
    const ipHash = digest(request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local")
    await transaction(async tx => {
        const since = new Date(Date.now() - 15 * 60 * 1000)
        const [phones, ips] = await Promise.all([tx.rangeLoginAttempt.count({ where: { phoneHash, createdAt: { gt: since } } }), tx.rangeLoginAttempt.count({ where: { ipHash, createdAt: { gt: since } } })])
        if (phones >= 5 || ips >= 30) throw new RangeError("Too many attempts. Try again in 15 minutes.", 429)
        await tx.rangeLoginAttempt.create({ data: { phoneHash, ipHash } })
    })
    const user = await prisma.rangeUser.findUnique({ where: identity })
    // A dummy derivation also makes unknown-account login attempts expensive.
    const valid = await verifyPassword(password, user?.passwordHash ?? `scrypt$00000000000000000000000000000000$${"0".repeat(128)}`)
    if (!valid || !user?.active) throw new RangeError("Invalid username, phone number or password.", 401)
    const token = randomBytes(32).toString("hex")
    await prisma.rangeSession.create({ data: { tokenHash: digest(token), userId: user.id, expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) } })
    return sessionResponse(token, { id: user.id, name: user.name, phone: user.phone, username: user.username, shooterProfileId: user.shooterProfileId, role: user.role, mustChangePassword: user.mustChangePassword })
}
export async function logout(request: NextRequest) {
    const token = request.cookies.get(SESSION_COOKIE)?.value
    if (token) await prisma.rangeSession.deleteMany({ where: { tokenHash: digest(token) } })
    const response = NextResponse.json({ ok: true })
    response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 })
    return response
}
export async function changePassword(request: NextRequest, actor: RangeActor) {
    const body = await jsonBody(request)
    const user = await prisma.rangeUser.findUniqueOrThrow({ where: { id: actor.id } })
    if (!await verifyPassword(String(body.currentPassword ?? ""), user.passwordHash)) throw new RangeError("Current password is incorrect.", 403)
    validatePassword(body.password)
    const passwordHash = await hashPassword(body.password)
    const token = randomBytes(32).toString("hex")
    await transaction(async tx => {
        // Serialize password changes against resets/deactivation.
        const updated = await tx.rangeUser.updateMany({ where: { id: actor.id, passwordHash: user.passwordHash, active: true }, data: { passwordHash, mustChangePassword: false } })
        if (!updated.count) throw new RangeError("Account changed. Please sign in again.", 409)
        await tx.rangeSession.deleteMany({ where: { userId: actor.id } })
        await tx.rangeSession.create({ data: { tokenHash: digest(token), userId: actor.id, expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) } })
        await audit(tx, actor, "password.changed", actor.id)
    })
    return sessionResponse(token, { ...actor, mustChangePassword: false })
}
export async function listLocations(actor: RangeActor) {
    if (actor.role === "student") return []
    return prisma.rangeLocation.findMany({ where: { active: true, ...(actor.role === "owner" ? {} : { memberships: { some: { userId: actor.id } } }) }, select: { id: true, name: true, slug: true, timeZone: true }, orderBy: { name: "asc" } })
}
export async function staffAction(request: NextRequest, actor: RangeActor) {
    ownerOnly(actor)
    if (request.method === "GET") return Response.json({ staff: await prisma.rangeUser.findMany({ where: { role: { in: ["owner", "coach"] } }, select: publicUser, orderBy: { name: "asc" } }) })
    const body = await jsonBody(request)
    const id = typeof body.id === "string" ? body.id : undefined
    const name = textField(body.name, "Name", 100)
    const phone = normalizePhone(body.phone)
    const locationIds = Array.isArray(body.locationIds) ? [...new Set(body.locationIds.filter((x): x is string => typeof x === "string"))] : []
    if (!locationIds.length) throw new RangeError("Assign at least one location.")
    if (typeof body.active !== "boolean") throw new RangeError("Choose an account status.")
    const passwordHash = body.password ? await hashPassword(String(body.password)) : undefined
    if (!id && !passwordHash) throw new RangeError("A temporary password is required.")
    return Response.json(await transaction(async tx => {
        const before = id ? await tx.rangeUser.findUnique({ where: { id }, select: publicUser }) : null
        if (id && !before) throw new RangeError("Staff account not found.", 404)
        if (before?.role === "owner") throw new RangeError("Owner accounts are managed through the recovery tool.", 403)
        if (before && before.role !== "coach") throw new RangeError("Use student account management for this account.", 403)
        if (await tx.rangeLocation.count({ where: { id: { in: locationIds }, active: true } }) !== locationIds.length) throw new RangeError("Select active locations.")
        const user = id ? await tx.rangeUser.update({ where: { id }, data: { name, phone, active: body.active as boolean, ...(passwordHash ? { passwordHash, mustChangePassword: true } : {}) }, select: publicUser }) : await tx.rangeUser.create({ data: { name, phone, passwordHash: passwordHash!, role: "coach" }, select: publicUser })
        await tx.rangeMembership.deleteMany({ where: { userId: user.id } })
        await tx.rangeMembership.createMany({ data: locationIds.map(locationId => ({ userId: user.id, locationId })) })
        if (passwordHash || !body.active) await tx.rangeSession.deleteMany({ where: { userId: user.id } })
        await audit(tx, actor, id ? "staff.updated" : "staff.created", user.id, before, { ...user, locationIds })
        return { ok: true }
    }))
}
export async function locationAction(request: NextRequest, actor: RangeActor) {
    if (request.method === "GET") return Response.json({ locations: await listLocations(actor) })
    ownerOnly(actor)
    const body = await jsonBody(request)
    const name = textField(body.name, "Location name", 100)
    const slug = textField(body.slug, "Location slug", 80)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new RangeError("Use lowercase letters, numbers and hyphens for the slug.")
    return Response.json(await transaction(async tx => {
        const location = await tx.rangeLocation.create({ data: { name, slug } })
        await audit(tx, actor, "location.created", location.id, undefined, location, location.id)
        return { location }
    }))
}
