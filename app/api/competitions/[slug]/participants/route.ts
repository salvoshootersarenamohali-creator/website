import { hasCompetitionEnded } from "@/lib/competition"
import { serializeCompetition } from "@/lib/competition-server"
import { toPublicParticipantDirectory } from "@/lib/participants"
import { loadParticipantDirectory } from "@/lib/participants-server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
    params: Promise<{ slug: string }>
}

export const dynamic = "force-dynamic"

export async function GET(_request: Request, context: RouteContext) {
    try {
        const { slug } = await context.params
        const competition = await prisma.competition.findUnique({ where: { slug } })
        if (!competition || !competition.isPublished) {
            return Response.json({ error: "Competition not found." }, { status: 404 })
        }
        if (!hasCompetitionEnded(competition.endDate)) {
            return Response.json({ error: "Certificates will be available after the competition ends." }, { status: 403 })
        }

        const directory = await loadParticipantDirectory(competition.id, competition.slug)
        const publicDirectory = toPublicParticipantDirectory(directory)
        return Response.json({
            competition: serializeCompetition(competition),
            generatedAt: new Date().toISOString(),
            ...publicDirectory,
        })
    } catch (error) {
        console.error("Unable to load certificate participants", error)
        return Response.json({ error: "Unable to load participants right now." }, { status: 500 })
    }
}
