import { loadRegistrationSummary, loadRosterPage } from "@/lib/admin-roster"
import { NextRequest } from "next/server"
import { adminUnauthorized, isCompetitionAdminRequest } from "@/lib/admin"
import { getCompetitionBySlugOrActive, getCompetitionSlugFromRequest, serializeCompetition } from "@/lib/competition-server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
    if (!(await isCompetitionAdminRequest(request))) return adminUnauthorized()

    try {
        const slug = getCompetitionSlugFromRequest(request)
        const competition = await getCompetitionBySlugOrActive(slug)
        if (!competition) return Response.json({ error: "Competition not found." }, { status: 404 })

        const info = serializeCompetition(competition)
        const view = request.nextUrl.searchParams.get("view")
        if (view === "summary") {
            return Response.json({ competition: info, summary: await loadRegistrationSummary(competition.id) })
        }
        if (view === "roster") {
            return Response.json(await loadRosterPage(competition.id, info.config, request.nextUrl.searchParams))
        }
        const include = {
            relayBooking: true, batch: true,
            entries: { orderBy: { createdAt: "asc" as const }, include: { bharatCupResult: { select: { flaggedSeriesTwo: true } } } },
            documents: { orderBy: { position: "asc" as const } },
        }
        if (view === "detail") {
            const registration = await prisma.registration.findFirst({ where: { competitionId: competition.id, id: request.nextUrl.searchParams.get("id") ?? "" }, include })
            return registration ? Response.json({ registration }) : Response.json({ error: "Registration not found." }, { status: 404 })
        }
        const registrations = await prisma.registration.findMany({ where: { competitionId: competition.id }, orderBy: { createdAt: "desc" }, include })
        return Response.json({ competition: info, registrations })
    } catch (error) {
        console.error("Unable to load admin registrations", error)
        return Response.json({ error: "Unable to load registrations. Check the database connection and migrations." }, { status: 500 })
    }
}
