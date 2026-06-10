import { NextRequest } from "next/server"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { getCompetitionBySlugOrActive, getCompetitionSlugFromRequest, serializeCompetition } from "@/lib/competition-server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const slug = getCompetitionSlugFromRequest(request)
        const competition = await getCompetitionBySlugOrActive(slug)
        if (!competition) return Response.json({ error: "Competition not found." }, { status: 404 })

        const registrations = await prisma.registration.findMany({
            where: { competitionId: competition.id },
            orderBy: { createdAt: "desc" },
            include: { entries: { orderBy: { createdAt: "asc" } } },
        })

        return Response.json({ competition: serializeCompetition(competition), registrations })
    } catch (error) {
        console.error("Unable to load admin registrations", error)
        return Response.json({ error: "Unable to load registrations. Check the database connection and migrations." }, { status: 500 })
    }
}
