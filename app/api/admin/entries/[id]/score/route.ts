import { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { adminUnauthorized, isCompetitionAdminRequest } from "@/lib/admin"
import { getScoringFormat, isValidSeriesTotal } from "@/lib/competition"
import { getCompetitionBySlugOrActive, getCompetitionSlugFromRequest } from "@/lib/competition-server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
    params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    if (!(await isCompetitionAdminRequest(request))) return adminUnauthorized()

    try {
        const { id } = await context.params
        const body = await request.json()
        const rawSeriesScores = Array.isArray(body.seriesScores) ? body.seriesScores : []
        const rawInnerTenCount = body.innerTenCount
        const rawLegacySeriesInnerTenCounts = Array.isArray(body.seriesInnerTenCounts) ? body.seriesInnerTenCounts : []

        const slug = getCompetitionSlugFromRequest(request)
        const competition = await getCompetitionBySlugOrActive(slug)
        if (!competition) return Response.json({ error: "Competition not found." }, { status: 404 })

        const entry = await prisma.registrationEntry.findUnique({
            where: { id },
            include: { registration: { select: { competitionId: true } } },
        })
        if (!entry) return Response.json({ error: "Entry not found." }, { status: 404 })
        if (entry.registration.competitionId !== competition.id) return Response.json({ error: "Entry not found for this competition." }, { status: 404 })

        const ruleSet = entry.ruleSet === "ISSF" ? "ISSF" : "NR"
        const format = getScoringFormat(ruleSet, entry)
        const expectedSeries = format.seriesCount

        if (rawSeriesScores.length !== expectedSeries) {
            return Response.json({ error: `${entry.ruleSet} entries require ${expectedSeries} series totals.` }, { status: 400 })
        }

        const seriesScores: number[] = []
        for (const score of rawSeriesScores) {
            const text = String(score).trim()
            const value = Number(text)
            if (!isValidSeriesTotal(score, format)) {
                const ruleText = format.decimalPlaces ? "with at most one decimal place" : "as whole numbers"
                return Response.json({ error: `Series totals must be from 0 to ${format.maxSeriesScore} ${ruleText}.` }, { status: 400 })
            }

            seriesScores.push(Number(value.toFixed(format.decimalPlaces)))
        }

        const maxInnerTenCount = expectedSeries * format.shotsPerSeries
        let parsedInnerTenCount = 0
        if (!format.usesInnerTens) {
            parsedInnerTenCount = 0
        } else if (rawInnerTenCount !== undefined && rawInnerTenCount !== null) {
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

        const totalScore = Number(seriesScores.reduce((sum, score) => sum + score, 0).toFixed(format.decimalPlaces))

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
    if (!(await isCompetitionAdminRequest(request))) return adminUnauthorized()

    try {
        const { id } = await context.params
        const slug = getCompetitionSlugFromRequest(request)
        const competition = await getCompetitionBySlugOrActive(slug)
        if (!competition) return Response.json({ error: "Competition not found." }, { status: 404 })
        const entry = await prisma.registrationEntry.findUnique({
            where: { id },
            select: {
                id: true,
                registrationId: true,
                registration: {
                    select: {
                        id: true,
                        competitionId: true,
                        name: true,
                        entries: {
                            select: { id: true },
                        },
                    },
                },
            },
        })

        if (!entry) return Response.json({ error: "Entry not found." }, { status: 404 })
        if (entry.registration.competitionId !== competition.id) return Response.json({ error: "Entry not found for this competition." }, { status: 404 })

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
