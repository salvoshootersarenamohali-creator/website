import { NextRequest } from "next/server"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { normalizeCompetitionConfig } from "@/lib/competition"
import { getCompetitionBySlugOrActive, getCompetitionSlugFromRequest } from "@/lib/competition-server"
import { setRegistrationParaStatus } from "@/lib/para-registration-server"

type RouteContext = {
    params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const { id } = await context.params
        const body = await request.json()
        if (typeof body.isPara !== "boolean") {
            return Response.json({ error: "Para status must be true or false." }, { status: 400 })
        }

        const slug = getCompetitionSlugFromRequest(request)
        const competition = await getCompetitionBySlugOrActive(slug)
        if (!competition) return Response.json({ error: "Competition not found." }, { status: 404 })

        const registration = await setRegistrationParaStatus({
            competitionId: competition.id,
            registrationId: id,
            config: normalizeCompetitionConfig(competition.config),
            isPara: body.isPara,
        })
        if (!registration) return Response.json({ error: "Registration not found for this competition." }, { status: 404 })

        return Response.json({ registration })
    } catch (error) {
        console.error("Unable to update para shooter status", error)
        return Response.json({ error: "Unable to update para shooter status. Check the database connection and try again." }, { status: 500 })
    }
}
