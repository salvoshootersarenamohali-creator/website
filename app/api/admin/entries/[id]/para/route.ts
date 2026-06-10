import { NextRequest } from "next/server"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { getCompetitionBySlugOrActive, getCompetitionSlugFromRequest } from "@/lib/competition-server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
    params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const { id } = await context.params
        const body = await request.json()
        const isPara = body.isPara === true
        const slug = getCompetitionSlugFromRequest(request)
        const competition = await getCompetitionBySlugOrActive(slug)
        if (!competition) return Response.json({ error: "Competition not found." }, { status: 404 })

        const existing = await prisma.registrationEntry.findUnique({
            where: { id },
            select: { id: true, registration: { select: { competitionId: true } } },
        })
        if (!existing) return Response.json({ error: "Entry not found." }, { status: 404 })
        if (existing.registration.competitionId !== competition.id) return Response.json({ error: "Entry not found for this competition." }, { status: 404 })

        const entry = await prisma.registrationEntry.update({
            where: { id },
            data: { isPara },
        })

        return Response.json({ entry })
    } catch (error) {
        console.error("Unable to update para entry status", error)
        return Response.json({ error: "Unable to update para entry status. Check the database connection and try again." }, { status: 500 })
    }
}
