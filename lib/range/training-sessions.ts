import { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { audit, jsonBody, staffOnly } from "./server"
import { RangeActor, RangeError, textField } from "./shared"
import { claimMedia, currentPlanInclude, expectedVersion, mediaIds, optionalText, pageNumber, planRevisionInclude, sessionFields, trainingAccess, trainingAsset, trainingAuthor, trainingDates, trainingMutation } from "./training-core"

export type ReviewSummary = { coachId: string; reviewed: boolean; sessionVersion: number }
export function reviewStatus(version: number, reviews: ReviewSummary[], coachId?: string) {
    const relevant = coachId ? reviews.filter(review => review.coachId === coachId) : reviews
    if (relevant.some(review => review.reviewed && review.sessionVersion < version)) return "changed"
    return relevant.some(review => review.reviewed && review.sessionVersion === version) ? "reviewed" : "unreviewed"
}
const sessionRevisionInclude = { attachments: { select: trainingAsset }, planRevision: { include: planRevisionInclude } } as const
const sessionInclude = { revisions: { orderBy: { version: "desc" as const }, take: 1, include: sessionRevisionInclude }, reviews: { include: { coach: { select: trainingAuthor } } } } as const
function disciplineFilter(request: NextRequest) {
    const discipline = request.nextUrl.searchParams.get("discipline") || ""
    if (discipline && !["pistol", "rifle", "general"].includes(discipline)) throw new RangeError("Invalid discipline.")
    return discipline ? { discipline } : {}
}

export async function trainingSessions(request: NextRequest, actor: RangeActor) {
    if (request.method === "GET") {
        const profile = await trainingAccess(actor, request.nextUrl.searchParams.get("profileId")), page = pageNumber(request)
        const where: Prisma.RangeTrainingSessionWhereInput = { profileId: profile.id, date: trainingDates(request), ...disciplineFilter(request) }
        const status = request.nextUrl.searchParams.get("review") || ""
        if (status && !["unreviewed", "changed", "reviewed"].includes(status)) throw new RangeError("Invalid review filter.")
        if (status) {
            const candidates = await prisma.rangeTrainingSession.findMany({ where, select: { id: true, version: true, reviews: { select: { coachId: true, reviewed: true, sessionVersion: true } } } })
            where.id = { in: candidates.filter(item => reviewStatus(item.version, item.reviews, actor.role === "coach" ? actor.id : undefined) === status).map(item => item.id) }
        }
        const [sessions, total] = await prisma.$transaction([prisma.rangeTrainingSession.findMany({ where, include: sessionInclude, orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "asc" }], skip: (page - 1) * 50, take: 50 }), prisma.rangeTrainingSession.count({ where })])
        return Response.json({ sessions: sessions.map(session => ({ ...session, reviewStatus: reviewStatus(session.version, session.reviews, actor.role === "coach" ? actor.id : undefined) })), total, page })
    }
    if (actor.role !== "student") throw new RangeError("Only students can write their diary.", 403)
    const body = await jsonBody(request), fields = sessionFields(body), attachmentIds = mediaIds(body.attachmentIds, 10)
    const id = body.id ? textField(body.id, "Session") : undefined, version = expectedVersion(body.version)
    return Response.json(await trainingMutation(actor, "training.session", body, async db => {
        const profile = await trainingAccess(actor, body.profileId, db)
        const before = id ? await db.rangeTrainingSession.findUnique({ where: { id }, include: sessionInclude }) : null
        if (id && (!before || before.profileId !== profile.id)) throw new RangeError("Session not found.", 404)
        if ((before?.version || 0) !== version) throw new RangeError("Session changed. Refresh before saving.", 409)
        const plan = await db.rangeTrainingPlan.findUnique({ where: { profileId_date: { profileId: profile.id, date: fields.date } }, include: currentPlanInclude })
        const planRevisionId = before && before.date === fields.date ? before.revisions[0]?.planRevisionId : plan?.revisions[0]?.id
        await claimMedia(db, actor, attachmentIds, "target", before?.revisions[0]?.attachments.map(asset => asset.id))
        const revision = { ...fields, version: version + 1, planRevisionId: planRevisionId || null, attachments: { connect: attachmentIds.map(id => ({ id })) } }
        const session = before ? await db.rangeTrainingSession.update({ where: { id: before.id }, data: { date: fields.date, discipline: fields.discipline, version: { increment: 1 }, revisions: { create: revision } } }) : await db.rangeTrainingSession.create({ data: { profileId: profile.id, date: fields.date, discipline: fields.discipline, revisions: { create: revision } } })
        await audit(db, actor, "training.session.saved", session.id, before ? { version: before.version } : undefined, { profileId: profile.id, version: session.version, date: fields.date })
        return { session }
    }))
}

export async function trainingSessionHistory(request: NextRequest, actor: RangeActor) {
    const id = textField(request.nextUrl.searchParams.get("id"), "Session")
    const session = await prisma.rangeTrainingSession.findUnique({ where: { id } })
    if (!session) throw new RangeError("Session not found.", 404)
    await trainingAccess(actor, session.profileId)
    const revisions = await prisma.rangeTrainingSessionRevision.findMany({ where: { sessionId: id }, include: sessionRevisionInclude, orderBy: { version: "desc" } })
    const reviews = await prisma.rangeTrainingReview.findMany({ where: { sessionId: id }, include: { coach: { select: trainingAuthor }, revisions: { orderBy: { version: "desc" } } } })
    return Response.json({ session, revisions, reviews })
}

export async function trainingReview(request: NextRequest, actor: RangeActor) {
    staffOnly(actor)
    const body = await jsonBody(request), sessionId = textField(body.sessionId, "Session"), version = expectedVersion(body.version), sessionVersion = expectedVersion(body.sessionVersion), remarks = optionalText(body.remarks, "Remarks", 5000)
    if (typeof body.reviewed !== "boolean") throw new RangeError("Choose review status.")
    return Response.json(await trainingMutation(actor, "training.review", body, async db => {
        const session = await db.rangeTrainingSession.findUnique({ where: { id: sessionId } })
        if (!session) throw new RangeError("Session not found.", 404)
        await trainingAccess(actor, session.profileId, db)
        if (session.version !== sessionVersion) throw new RangeError("The student changed this session. Refresh before reviewing.", 409)
        const before = await db.rangeTrainingReview.findUnique({ where: { sessionId_coachId: { sessionId, coachId: actor.id } } })
        if ((before?.version || 0) !== version) throw new RangeError("Your remarks changed. Refresh before saving.", 409)
        const data = { sessionVersion, remarks, reviewed: body.reviewed as boolean }
        const revision = { ...data, version: version + 1 }
        const review = before ? await db.rangeTrainingReview.update({ where: { id: before.id }, data: { ...data, version: { increment: 1 }, revisions: { create: revision } } }) : await db.rangeTrainingReview.create({ data: { ...data, sessionId, coachId: actor.id, revisions: { create: revision } } })
        await audit(db, actor, "training.review.saved", review.id, before || undefined, review)
        return { review }
    }))
}

export type ScoreRecord = { date: string; discipline: string; score: number | string | Prisma.Decimal | null; maximumScore: number | string | Prisma.Decimal | null; durationMinutes: number | null; shotCount: number | null }
export function summarizeTraining(records: ScoreRecord[]) {
    const days = new Map<string, { date: string; sessions: number; durationMinutes: number | null; shotCount: number | null; score: number | null; maximumScore: number | null; percentage: number | null }>()
    for (const record of records) {
        const day = days.get(record.date) || { date: record.date, sessions: 0, durationMinutes: null, shotCount: null, score: null, maximumScore: null, percentage: null }
        day.sessions++
        if (record.durationMinutes !== null) day.durationMinutes = (day.durationMinutes ?? 0) + record.durationMinutes
        if (record.shotCount !== null) day.shotCount = (day.shotCount ?? 0) + record.shotCount
        if (record.score !== null && record.maximumScore !== null) {
            day.score = (day.score ?? 0) + Number(record.score)
            day.maximumScore = (day.maximumScore ?? 0) + Number(record.maximumScore)
            day.percentage = day.score / day.maximumScore * 100
        }
        days.set(record.date, day)
    }
    const series = [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
    const scored = series.filter(day => day.score !== null)
    const score = scored.reduce((sum, day) => sum + day.score!, 0), maximum = scored.reduce((sum, day) => sum + day.maximumScore!, 0)
    const sumOptional = (key: "durationMinutes" | "shotCount") => series.some(day => day[key] !== null) ? series.reduce((sum, day) => sum + (day[key] ?? 0), 0) : null
    return { series, summary: { sessions: records.length, trainingDays: series.length, percentage: maximum > 0 ? score / maximum * 100 : null, durationMinutes: sumOptional("durationMinutes"), shotCount: sumOptional("shotCount") } }
}

export async function trainingAnalytics(request: NextRequest, actor: RangeActor) {
    const profile = await trainingAccess(actor, request.nextUrl.searchParams.get("profileId"))
    const sessions = await prisma.rangeTrainingSession.findMany({ where: { profileId: profile.id, date: trainingDates(request), ...disciplineFilter(request) }, select: { id: true, revisions: { orderBy: { version: "desc" }, take: 1, select: { date: true, discipline: true, label: true, score: true, maximumScore: true, durationMinutes: true, shotCount: true } } }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] })
    const records = sessions.flatMap(session => session.revisions.map(revision => ({ ...revision, id: session.id })))
    return Response.json({ ...summarizeTraining(records), records })
}
