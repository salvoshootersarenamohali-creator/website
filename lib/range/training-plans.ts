import { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { audit, jsonBody, staffOnly, transaction } from "./server"
import { dateField, RangeActor, RangeError, textField } from "./shared"
import { claimMedia, currentPlanInclude, expectedVersion, mediaIds, optionalText, pageNumber, planRevisionInclude, trainingAccess, trainingDates, trainingMutation } from "./training-core"

export async function previewPlans(request: NextRequest, actor: RangeActor) {
    staffOnly(actor)
    const body = await jsonBody(request), date = dateField(body.date)
    if (!Array.isArray(body.profileIds) || !body.profileIds.length || body.profileIds.some(id => typeof id !== "string") || new Set(body.profileIds).size !== body.profileIds.length) throw new RangeError("Select students for the plan.")
    const profileIds = body.profileIds as string[]
    const rows = await transaction(async db => {
        const rows = []
        for (const profileId of profileIds) {
            const profile = await trainingAccess(actor, profileId, db)
            const plan = await db.rangeTrainingPlan.findUnique({ where: { profileId_date: { profileId, date } }, include: currentPlanInclude })
            rows.push({ profileId, name: profile.name, plan })
        }
        return rows
    })
    return Response.json({ rows, date })
}

export async function trainingPlans(request: NextRequest, actor: RangeActor) {
    if (request.method === "GET") {
        const profile = await trainingAccess(actor, request.nextUrl.searchParams.get("profileId")), date = trainingDates(request), page = pageNumber(request)
        const where = { profileId: profile.id, date }
        const [plans, total] = await prisma.$transaction([prisma.rangeTrainingPlan.findMany({ where, include: currentPlanInclude, orderBy: { date: "desc" }, skip: (page - 1) * 50, take: 50 }), prisma.rangeTrainingPlan.count({ where })])
        return Response.json({ plans, total, page })
    }
    staffOnly(actor)
    const body = await jsonBody(request), date = dateField(body.date)
    if (!Array.isArray(body.rows) || !body.rows.length) throw new RangeError("Select plans to save.")
    const rows = body.rows.map(value => {
        if (!value || typeof value !== "object" || Array.isArray(value)) throw new RangeError("Invalid plan.")
        const row = value as Record<string, unknown>
        const instructions = optionalText(row.instructions, "Instructions"), attachmentIds = mediaIds(row.attachmentIds, 5)
        if (!instructions && !attachmentIds.length) throw new RangeError("Add instructions or a training document.")
        return { profileId: textField(row.profileId, "Student"), version: expectedVersion(row.version), replace: row.replace === true, title: textField(row.title, "Plan title", 100), instructions, attachmentIds }
    })
    if (new Set(rows.map(row => row.profileId)).size !== rows.length) throw new RangeError("A student can have only one plan per day.")
    return Response.json(await trainingMutation(actor, "training.plans", body, async db => {
        const existing = new Map<string, Prisma.RangeTrainingPlanGetPayload<{ include: typeof currentPlanInclude }> | null>()
        // Check the entire selection before claiming shared attachments or changing plans.
        const allowedIds: string[] = []
        for (const row of rows) {
            await trainingAccess(actor, row.profileId, db)
            const before = await db.rangeTrainingPlan.findUnique({ where: { profileId_date: { profileId: row.profileId, date } }, include: currentPlanInclude })
            if ((before?.version || 0) !== row.version) throw new RangeError("A plan changed after preview. Refresh the preview before saving.", 409)
            if (before && !row.replace) throw new RangeError("Explicitly confirm replacement of existing plans.", 409)
            existing.set(row.profileId, before)
            allowedIds.push(...(before?.revisions[0]?.attachments.map(asset => asset.id) || []))
        }
        await claimMedia(db, actor, [...new Set(rows.flatMap(row => row.attachmentIds))], "plan", allowedIds)
        const plans = []
        for (const row of rows) {
            const before = existing.get(row.profileId)
            const revision = { version: row.version + 1, authorId: actor.id, title: row.title, instructions: row.instructions, attachments: { connect: row.attachmentIds.map(id => ({ id })) } }
            const plan = before ? await db.rangeTrainingPlan.update({ where: { id: before.id }, data: { version: { increment: 1 }, revisions: { create: revision } } }) : await db.rangeTrainingPlan.create({ data: { profileId: row.profileId, date, revisions: { create: revision } } })
            await audit(db, actor, "training.plan.saved", plan.id, { version: row.version }, { version: plan.version, profileId: row.profileId, date })
            plans.push({ id: plan.id, profileId: plan.profileId, version: plan.version })
        }
        return { plans }
    }))
}

export async function trainingPlanHistory(request: NextRequest, actor: RangeActor) {
    const id = textField(request.nextUrl.searchParams.get("id"), "Plan")
    const plan = await prisma.rangeTrainingPlan.findUnique({ where: { id } })
    if (!plan) throw new RangeError("Plan not found.", 404)
    await trainingAccess(actor, plan.profileId)
    const revisions = await prisma.rangeTrainingPlanRevision.findMany({ where: { planId: id }, include: planRevisionInclude, orderBy: { version: "desc" } })
    return Response.json({ plan, revisions })
}
