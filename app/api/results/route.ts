import { NextRequest } from "next/server"
import { getCompetitionBySlugOrActive, getCompetitionSlugFromRequest } from "@/lib/competition-server"
import { getResultBodies } from "@/lib/public-results"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
    try {
        const competition = await getCompetitionBySlugOrActive(getCompetitionSlugFromRequest(request))
        if (!competition?.isPublished || (!competition.resultsPublished && !competition.registrationOpen)) {
            return Response.json({ error: "Results are not available for this competition." }, { status: 404 })
        }
        const tv = request.nextUrl.searchParams.get("view") === "tv"
        const generatedAt = competition.updatedAt.toISOString()
        const etag = `W/"results-v3-${competition.id}-${generatedAt}-${tv ? "tv" : "full"}"`
        const headers = { ETag: etag, "Cache-Control": "private, no-cache" }
        if (request.headers.get("if-none-match")?.split(",").some(tag => tag.trim() === etag)) {
            return new Response(null, { status: 304, headers })
        }
        const bodies = await getResultBodies(competition, generatedAt)
        return new Response(tv ? bodies.tv : bodies.full, { headers: { ...headers, "Content-Type": "application/json" } })
    } catch (error) {
        console.error("Unable to load public results", error)
        return Response.json({ error: "Unable to load results right now." }, { status: 500 })
    }
}
