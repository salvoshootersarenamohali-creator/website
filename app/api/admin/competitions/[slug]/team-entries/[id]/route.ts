import { NextRequest } from "next/server"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { getCompetitionBySlugOrActive } from "@/lib/competition-server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
    params: Promise<{ slug: string; id: string }>
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const { slug, id } = await context.params
        const competition = await getCompetitionBySlugOrActive(slug)
        if (!competition) return Response.json({ error: "Competition not found." }, { status: 404 })

        const teamEntry = await prisma.teamEntry.findUnique({
            where: { id },
            select: { id: true, competitionId: true, name: true },
        })
        if (!teamEntry || teamEntry.competitionId !== competition.id) {
            return Response.json({ error: "Team entry not found for this competition." }, { status: 404 })
        }

        await prisma.teamEntry.delete({ where: { id } })
        return Response.json({ deletedTeamEntryId: teamEntry.id, deletedName: teamEntry.name })
    } catch (error) {
        console.error("Unable to delete team entry", error)
        return Response.json({ error: "Unable to delete team entry." }, { status: 500 })
    }
}
