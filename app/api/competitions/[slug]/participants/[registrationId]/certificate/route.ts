import { certificateFileName, generateParticipantCertificate } from "@/lib/certificate-pdf"
import { hasCompetitionEnded } from "@/lib/competition"
import { serializeCompetition } from "@/lib/competition-server"
import { loadParticipantDirectory } from "@/lib/participants-server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
    params: Promise<{ slug: string; registrationId: string }>
}

export const dynamic = "force-dynamic"

export async function GET(_request: Request, context: RouteContext) {
    try {
        const { slug, registrationId } = await context.params
        const competition = await prisma.competition.findUnique({ where: { slug } })
        if (!competition || !competition.isPublished) {
            return Response.json({ error: "Competition not found." }, { status: 404 })
        }
        if (!hasCompetitionEnded(competition.endDate)) {
            return Response.json({ error: "Certificates will be available after the competition ends." }, { status: 403 })
        }

        const directory = await loadParticipantDirectory(competition.id, competition.slug)
        const participant = directory.participants.find((item) => item.registrationId === registrationId)
        if (!participant) {
            return Response.json({ error: "No certificate is available for this participant." }, { status: 404 })
        }

        const pdf = await generateParticipantCertificate(serializeCompetition(competition), participant)
        return new Response(Buffer.from(pdf), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${certificateFileName(participant.shooterName, competition.slug)}"`,
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
            },
        })
    } catch (error) {
        console.error("Unable to generate participant certificate", error)
        return Response.json({ error: "Unable to generate the certificate right now." }, { status: 500 })
    }
}
