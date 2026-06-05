import { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { getScoringSeriesCount } from "@/lib/competition"
import { prisma } from "@/lib/prisma"

type RouteContext = {
    params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const { id } = await context.params
        const body = await request.json()
        const rawSeriesScores = Array.isArray(body.seriesScores) ? body.seriesScores : []
        const rawInnerTenCount = body.innerTenCount
        const rawLegacySeriesInnerTenCounts = Array.isArray(body.seriesInnerTenCounts) ? body.seriesInnerTenCounts : []

        const entry = await prisma.registrationEntry.findUnique({ where: { id } })
        if (!entry) return Response.json({ error: "Entry not found." }, { status: 404 })

        const ruleSet = entry.ruleSet === "ISSF" ? "ISSF" : "NR"
        const expectedSeries = getScoringSeriesCount(ruleSet, entry)

        if (rawSeriesScores.length !== expectedSeries) {
            return Response.json({ error: `${entry.ruleSet} entries require ${expectedSeries} series totals.` }, { status: 400 })
        }

        const seriesScores: number[] = []
        for (const score of rawSeriesScores) {
            const text = String(score).trim()
            const value = Number(text)
            const validFormat = ruleSet === "ISSF" ? /^\d{1,3}(\.\d)?$/.test(text) : /^\d{1,3}$/.test(text)
            const maxScore = ruleSet === "ISSF" ? 109 : 100

            if (!validFormat) {
                const ruleText = ruleSet === "ISSF" ? "at most one decimal place" : "whole numbers only"
                return Response.json({ error: `${entry.ruleSet} series totals must use ${ruleText}.` }, { status: 400 })
            }
            if (!Number.isFinite(value) || value < 0 || value > maxScore) {
                return Response.json({ error: `${entry.ruleSet} series totals must be from 0 to ${maxScore}.` }, { status: 400 })
            }

            seriesScores.push(ruleSet === "ISSF" ? Number(value.toFixed(1)) : value)
        }

        const maxInnerTenCount = expectedSeries * 10
        let parsedInnerTenCount = 0
        if (rawInnerTenCount !== undefined && rawInnerTenCount !== null) {
            const innerTenText = String(rawInnerTenCount).trim()
            parsedInnerTenCount = Number(innerTenText)
            if (!/^\d{1,3}$/.test(innerTenText) || !Number.isInteger(parsedInnerTenCount) || parsedInnerTenCount < 0 || parsedInnerTenCount > maxInnerTenCount) {
                return Response.json({ error: `Total 10x must be a whole number from 0 to ${maxInnerTenCount}.` }, { status: 400 })
            }
        } else if (rawLegacySeriesInnerTenCounts.length === expectedSeries) {
            const legacyCounts: number[] = []
            for (const [index, count] of rawLegacySeriesInnerTenCounts.entries()) {
                const text = String(count).trim()
                const value = Number(text)
                if (!/^\d{1,2}$/.test(text) || !Number.isInteger(value) || value < 0 || value > 10) {
                    return Response.json({ error: `Series ${index + 1} 10x count must be a whole number from 0 to 10.` }, { status: 400 })
                }
                legacyCounts.push(value)
            }
            parsedInnerTenCount = legacyCounts.reduce((sum, count) => sum + count, 0)
        } else {
            return Response.json({ error: `Total 10x must be a whole number from 0 to ${maxInnerTenCount}.` }, { status: 400 })
        }

        const totalScore = Number(seriesScores.reduce((sum, score) => sum + score, 0).toFixed(ruleSet === "ISSF" ? 1 : 0))

        const updated = await prisma.registrationEntry.update({
            where: { id },
            data: {
                shotScores: Prisma.JsonNull,
                seriesScores,
                seriesInnerTenCounts: Prisma.JsonNull,
                totalScore,
                innerTenCount: parsedInnerTenCount,
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
