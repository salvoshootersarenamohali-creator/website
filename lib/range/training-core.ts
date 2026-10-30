import { Prisma } from "@prisma/client"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { digest } from "./auth"
import { dateField, RangeActor, RangeError, rangeDay, textField } from "./shared"
import { snapshot, transaction } from "./server"

export type TrainingDB = Prisma.TransactionClient
export const trainingAuthor = { id: true, name: true } as const
export const trainingAsset = { id: true, name: true, mimeType: true, bytes: true } as const
export const planRevisionInclude = { author: { select: trainingAuthor }, attachments: { select: trainingAsset } } as const
export const currentPlanInclude = { revisions: { orderBy: { version: "desc" as const }, take: 1, include: planRevisionInclude } } as const

export async function trainingAccess(actor: RangeActor, requested?: unknown, db: TrainingDB = prisma) {
    // Read current identity inside mutations too, so resets and assignment changes
    // participate in the same serializable transaction as the write.
    const user = await db.rangeUser.findUnique({ where: { id: actor.id } })
    if (!user?.active || user.mustChangePassword) throw new RangeError("Please sign in with your personal password.", 403)
    const profileId = user.role === "student" ? user.shooterProfileId : textField(requested, "Student")
    if (!profileId) throw new RangeError("Student account is not linked to a profile.", 403)
    if (user.role === "student" && requested && requested !== profileId) throw new RangeError("Student access denied.", 403)
    if (user.role === "coach") {
        const assignment = await db.rangeTrainingCoach.findUnique({ where: { coachId_profileId: { coachId: user.id, profileId } } })
        if (!assignment?.active) throw new RangeError("This student is not assigned to you.", 403)
    } else if (!["owner", "student"].includes(user.role)) throw new RangeError("Training access denied.", 403)
    const profile = await db.rangeShooterProfile.findUnique({ where: { id: profileId }, select: { id: true, name: true } })
    if (!profile) throw new RangeError("Student not found.", 404)
    return profile
}

export function trainingDates(request: NextRequest) {
    const from = dateField(request.nextUrl.searchParams.get("from") || "2000-01-01")
    const to = dateField(request.nextUrl.searchParams.get("to") || "2099-12-31")
    if (from > to) throw new RangeError("Start date must be before end date.")
    return { gte: from, lte: to }
}

export function pageNumber(request: NextRequest) {
    const page = Number(request.nextUrl.searchParams.get("page") || 1)
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000) throw new RangeError("Invalid page.")
    return page
}

export function expectedVersion(value: unknown) {
    if (!Number.isSafeInteger(value) || Number(value) < 0) throw new RangeError("A record version is required.")
    return value as number
}

export function optionalText(value: unknown, label: string, max = 20000) {
    if (value === undefined || value === null || value === "") return ""
    if (typeof value !== "string" || value.length > max) throw new RangeError(`${label} must be at most ${max} characters.`)
    return value.trim()
}

export function mediaIds(value: unknown, limit: number) {
    if (!Array.isArray(value) || value.length > limit || value.some(id => typeof id !== "string" || !id || id.length > 100) || new Set(value).size !== value.length) throw new RangeError(`Select at most ${limit} different attachments.`)
    return value as string[]
}

export async function claimMedia(db: TrainingDB, actor: RangeActor, ids: string[], purpose: string, existingIds: string[] = []) {
    const assets = await db.rangeTrainingMedia.findMany({ where: { id: { in: ids } } })
    if (assets.length !== ids.length || assets.some(asset => asset.purpose !== purpose || (!existingIds.includes(asset.id) && (asset.ownerId !== actor.id || !asset.expiresAt || asset.expiresAt <= new Date())))) throw new RangeError("An attachment is unavailable. Upload it again.", 409)
    await db.rangeTrainingMedia.updateMany({ where: { id: { in: ids } }, data: { expiresAt: null } })
}

export async function trainingMutation(actor: RangeActor, kind: string, body: Record<string, unknown>, work: (db: TrainingDB) => Promise<unknown>) {
    const key = textField(body.submissionKey, "Submission key", 100)
    const hash = digest(JSON.stringify(body))
    return transaction(async db => {
        const user = await db.rangeUser.findUnique({ where: { id: actor.id } })
        if (!user?.active || user.mustChangePassword || user.role !== actor.role) throw new RangeError("Account access changed. Please sign in again.", 403)
        const previous = await db.rangeTrainingSubmission.findUnique({ where: { key } })
        if (previous) {
            if (previous.actorId !== actor.id || previous.kind !== kind || previous.hash !== hash) throw new RangeError("This submission key was already used.", 409)
            // Retried requests must still honor current coach assignments.
            if (kind === "training.plans") {
                for (const row of body.rows as { profileId: string }[]) await trainingAccess(actor, row.profileId, db)
            } else if (kind === "training.review") {
                const session = await db.rangeTrainingSession.findUnique({ where: { id: String(body.sessionId) } })
                if (!session) throw new RangeError("Session not found.", 404)
                await trainingAccess(actor, session.profileId, db)
            } else await trainingAccess(actor, body.profileId, db)
            return previous.result
        }
        const result = await work(db)
        await db.rangeTrainingSubmission.create({ data: { key, actorId: actor.id, kind, hash, result: snapshot(result) } })
        return result
    })
}

function optionalNumber(value: unknown, label: string, integer = false) {
    if (value === undefined || value === null || value === "") return null
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1000000000 || (integer ? !Number.isSafeInteger(value) : Math.abs(value * 100 - Math.round(value * 100)) > 0.00001)) throw new RangeError(`${label} must be a non-negative ${integer ? "whole number" : "number with at most two decimal places"}.`)
    return value
}

export function sessionFields(body: Record<string, unknown>) {
    const date = dateField(body.date)
    if (date > rangeDay()) throw new RangeError("Diary sessions cannot be in the future.")
    const discipline = textField(body.discipline, "Discipline")
    if (!["pistol", "rifle", "general"].includes(discipline)) throw new RangeError("Choose air pistol, air rifle, or general training.")
    const score = optionalNumber(body.score, "Score"), maximumScore = optionalNumber(body.maximumScore, "Maximum score")
    if ((score === null) !== (maximumScore === null) || (maximumScore !== null && (maximumScore <= 0 || score! > maximumScore))) throw new RangeError("Enter a score and positive maximum together; the score cannot exceed the maximum.")
    const durationMinutes = optionalNumber(body.durationMinutes, "Duration", true), shotCount = optionalNumber(body.shotCount, "Shot count", true)
    if (durationMinutes !== null && durationMinutes > 1440) throw new RangeError("Duration cannot exceed 1,440 minutes.")
    return { date, discipline, label: textField(body.label, "Session label", 100), notes: optionalText(body.notes, "Notes"), durationMinutes, shotCount, score, maximumScore }
}
