import { getActiveCompetition, getTemplatePublicCompetition, serializeCompetition } from "@/lib/competition-server"

export const dynamic = "force-dynamic"

export async function GET() {
    const competition = await getActiveCompetition().catch((error) => {
        if (process.env.NODE_ENV === "production") throw error
        return null
    })
    if (!competition) {
        if (process.env.NODE_ENV !== "production") {
            return Response.json({ competition: getTemplatePublicCompetition() })
        }
        return Response.json({ error: "No active competition is available." }, { status: 404 })
    }

    return Response.json({ competition: serializeCompetition(competition) })
}
