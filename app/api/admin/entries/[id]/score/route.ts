import { NextRequest } from "next/server"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { getShotCount, getSeriesCount, SHOTS_PER_SERIES } from "@/lib/competition"
import { prisma } from "@/lib/prisma"

type RouteContext = {
    params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const { id } = await context.params
        const body = await request.json()
        const rawShots = Array.isArray(body.shots) ? body.shots : Array.isArray(body.scores) ? body.scores : []

        const entry = await prisma.registrationEntry.findUnique({ where: { id } })
        if (!entry) return Response.json({ error: "Entry not found." }, { status: 404 })

        const ruleSet = entry.ruleSet === "ISSF" ? "ISSF" : "NR"
        const expectedShots = getShotCount(ruleSet)
        const expectedSeries = getSeriesCount(ruleSet)

        if (rawShots.length !== expectedShots) {
            return Response.json({ error: `${entry.ruleSet} entries require ${expectedShots} shot scores.` }, { status: 400 })
        }

        const shotScores: number[] = []
        for (const score of rawShots) {
            const text = String(score).trim()
            const value = Number(text)
            if (!/^\d{1,2}(\.\d)?$/.test(text)) {
                return Response.json({ error: "Each shot score must use at most one decimal place." }, { status: 400 })
            }
            if (!Number.isFinite(value) || value < 0 || value > 10.9) {
                return Response.json({ error: "Each shot score must be a number from 0.0 to 10.9." }, { status: 400 })
            }
            shotScores.push(value)
        }

        const seriesScores = Array.from({ length: expectedSeries }, (_, index) => {
            const seriesShots = shotScores.slice(index * SHOTS_PER_SERIES, (index + 1) * SHOTS_PER_SERIES)
            return Number(seriesShots.reduce((sum, score) => sum + score, 0).toFixed(1))
        })
        const totalScore = Number(shotScores.reduce((sum, score) => sum + score, 0).toFixed(1))
        const innerTenCount = shotScores.filter((score) => score >= 10.4).length

        const updated = await prisma.registrationEntry.update({
            where: { id },
            data: {
                shotScores,
                seriesScores,
                totalScore,
                innerTenCount,
            },
        })

        return Response.json({ entry: updated })
    } catch (error) {
        console.error("Unable to save score", error)
        return Response.json({ error: "Unable to save score. Check the database connection and migrations." }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const { id } = await context.params
        const entry = await prisma.registrationEntry.findUnique({
            where: { id },
            select: {
                id: true,
                registrationId: true,
                registration: {
                    select: {
                        id: true,
                        name: true,
                        entries: {
                            select: { id: true },
                        },
                    },
                },
            },
        })

        if (!entry) return Response.json({ error: "Entry not found." }, { status: 404 })

        await prisma.registration.delete({ where: { id: entry.registrationId } })

        return Response.json({
            deletedRegistrationId: entry.registration.id,
            deletedEntryIds: entry.registration.entries.map((registrationEntry) => registrationEntry.id),
            deletedName: entry.registration.name,
        })
    } catch (error) {
        console.error("Unable to delete registration", error)
        return Response.json({ error: "Unable to delete registration. Check the database connection and try again." }, { status: 500 })
    }
}
