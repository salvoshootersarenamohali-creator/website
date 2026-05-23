import { NextRequest } from "next/server"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { getSeriesCount } from "@/lib/competition"
import { prisma } from "@/lib/prisma"

type RouteContext = {
    params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    const { id } = await context.params
    const body = await request.json()
    const scores = Array.isArray(body.scores) ? body.scores : []

    const entry = await prisma.registrationEntry.findUnique({ where: { id } })
    if (!entry) return Response.json({ error: "Entry not found." }, { status: 404 })

    const expectedCount = getSeriesCount(entry.ruleSet === "ISSF" ? "ISSF" : "NR")
    const normalized: number[] = scores.slice(0, expectedCount).map((score: unknown) => {
        const value = Number(score)
        return Number.isFinite(value) && value >= 0 ? value : 0
    })

    while (normalized.length < expectedCount) normalized.push(0)

    const updated = await prisma.registrationEntry.update({
        where: { id },
        data: {
            seriesScores: normalized,
            totalScore: normalized.reduce((sum, score) => sum + score, 0),
        },
    })

    return Response.json({ entry: updated })
}
