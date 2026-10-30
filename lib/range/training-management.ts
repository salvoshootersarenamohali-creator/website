import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "./auth"
import { audit, jsonBody, ownerOnly } from "./server"
import { normalizeUsername, RangeActor, RangeError, textField } from "./shared"
import { expectedVersion, trainingAccess, trainingAuthor, trainingMutation } from "./training-core"

const accountSelect = { id: true, username: true, active: true, mustChangePassword: true, version: true } as const
export async function trainingRoster(actor: RangeActor) {
    const where = actor.role === "owner" ? {} : actor.role === "coach" ? { trainingCoaches: { some: { coachId: actor.id, active: true } } } : { id: actor.shooterProfileId || "" }
    const students = await prisma.rangeShooterProfile.findMany({ where, select: { id: true, name: true, trainingVersion: true, account: { select: accountSelect }, trainingCoaches: { where: { active: true }, select: { coachId: true, coach: { select: { ...trainingAuthor, active: true } } } } }, orderBy: [{ name: "asc" }, { id: "asc" }] })
    return Response.json({ students })
}

export async function studentAccounts(request: NextRequest, actor: RangeActor) {
    ownerOnly(actor)
    const body = await jsonBody(request)
    const profileId = textField(body.profileId, "Student"), username = normalizeUsername(body.username), version = expectedVersion(body.version)
    if (typeof body.active !== "boolean") throw new RangeError("Choose an account status.")
    const passwordHash = body.password ? await hashPassword(String(body.password)) : undefined
    return Response.json(await trainingMutation(actor, "student.account", body, async db => {
        const profile = await trainingAccess(actor, profileId, db)
        const before = await db.rangeUser.findUnique({ where: { shooterProfileId: profileId }, select: accountSelect })
        if ((before?.version || 0) !== version) throw new RangeError("Student account changed. Refresh before saving.", 409)
        if (!before && !passwordHash) throw new RangeError("A temporary password of at least 12 characters is required.")
        const data = { name: profile.name, username, active: body.active as boolean, ...(passwordHash ? { passwordHash, mustChangePassword: true } : {}) }
        const account = before ? await db.rangeUser.update({ where: { id: before.id }, data: { ...data, version: { increment: 1 } }, select: accountSelect }) : await db.rangeUser.create({ data: { ...data, passwordHash: passwordHash!, shooterProfileId: profileId, role: "student" }, select: accountSelect })
        if (passwordHash || !body.active) await db.rangeSession.deleteMany({ where: { userId: account.id } })
        await audit(db, actor, before ? "training.account.updated" : "training.account.created", account.id, before || undefined, account)
        return { account }
    }))
}

export async function trainingAssignments(request: NextRequest, actor: RangeActor) {
    ownerOnly(actor)
    if (request.method === "GET") return Response.json({ coaches: await prisma.rangeUser.findMany({ where: { role: "coach", active: true }, select: trainingAuthor, orderBy: { name: "asc" } }) })
    const body = await jsonBody(request), profileId = textField(body.profileId, "Student"), version = expectedVersion(body.version)
    if (!Array.isArray(body.coachIds) || body.coachIds.some(id => typeof id !== "string") || new Set(body.coachIds).size !== body.coachIds.length) throw new RangeError("Choose different coaches.")
    const coachIds = body.coachIds as string[]
    return Response.json(await trainingMutation(actor, "training.assignments", body, async db => {
        await trainingAccess(actor, profileId, db)
        if (await db.rangeUser.count({ where: { id: { in: coachIds }, role: "coach", active: true } }) !== coachIds.length) throw new RangeError("Choose active coaches.")
        const changed = await db.rangeShooterProfile.updateMany({ where: { id: profileId, trainingVersion: version }, data: { trainingVersion: { increment: 1 } } })
        if (!changed.count) throw new RangeError("Coach assignments changed. Refresh before saving.", 409)
        const before = await db.rangeTrainingCoach.findMany({ where: { profileId, active: true }, select: { coachId: true } })
        await db.rangeTrainingCoach.updateMany({ where: { profileId }, data: { active: false } })
        for (const coachId of coachIds) await db.rangeTrainingCoach.upsert({ where: { coachId_profileId: { coachId, profileId } }, create: { coachId, profileId }, update: { active: true } })
        await audit(db, actor, "training.coaches.updated", profileId, before, { coachIds })
        return { ok: true }
    }))
}
