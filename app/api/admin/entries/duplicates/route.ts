import { NextRequest } from "next/server"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { getCompetitionBySlugOrActive, getCompetitionSlugFromRequest } from "@/lib/competition-server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const competition = await getCompetitionBySlugOrActive(getCompetitionSlugFromRequest(request))
        if (!competition) return Response.json({ error: "Competition not found." }, { status: 404 })

        const entries = await prisma.registrationEntry.findMany({
            where: { registration: { competitionId: competition.id } },
            orderBy: { createdAt: "asc" },
            select: {
                id: true,
                registrationId: true,
                eventId: true,
                categoryCode: true,
            },
        })

        const groups = new Map<string, string[]>()
        entries.forEach((entry) => {
            const key = `${entry.registrationId}:${entry.eventId}:${entry.categoryCode}`
            groups.set(key, [...(groups.get(key) ?? []), entry.id])
        })

        const duplicateIds = Array.from(groups.values()).flatMap((ids) => ids.slice(1))
        if (!duplicateIds.length) {
            return Response.json({ deletedCount: 0 })
        }

        const deleted = await prisma.registrationEntry.deleteMany({
            where: { id: { in: duplicateIds } },
        })

        return Response.json({ deletedCount: deleted.count })
    } catch (error) {
        console.error("Unable to delete duplicate entries", error)
        return Response.json({ error: "Unable to delete duplicates. Check the database connection and migrations." }, { status: 500 })
    }
}
