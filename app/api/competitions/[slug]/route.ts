import { prisma } from "@/lib/prisma"
import { getTemplatePublicCompetition, serializeCompetition } from "@/lib/competition-server"

type RouteContext = {
    params: Promise<{ slug: string }>
}

export const dynamic = "force-dynamic"

export async function GET(_request: Request, context: RouteContext) {
    const { slug } = await context.params
    const competition = await prisma.competition.findUnique({ where: { slug } }).catch((error) => {
        if (process.env.NODE_ENV === "production") throw error
        return null
    })
    if (!competition && process.env.NODE_ENV !== "production" && slug === "36th-salvo-cup") {
        return Response.json({ competition: getTemplatePublicCompetition() })
    }
    if (!competition || !competition.isPublished) {
        return Response.json({ error: "Competition not found." }, { status: 404 })
    }

    return Response.json({ competition: serializeCompetition(competition) })
}
