import { normalizeCompetitionConfig } from "@/lib/competition"
import { buildRelayAvailability } from "@/lib/relay-booking"
import { prisma } from "@/lib/prisma"
export const dynamic = "force-dynamic"
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
    const competition = await prisma.competition.findUnique({ where: { slug: (await context.params).slug } })
    if (!competition?.isPublished) return Response.json({ error: "Competition not found." }, { status: 404 })
    const bookings = await prisma.registrationRelayBooking.groupBy({ by: ["date", "relayId", "pool"], where: { competitionId: competition.id }, _count: { _all: true } })
    return Response.json({ generatedAt: new Date().toISOString(), relays: buildRelayAvailability(normalizeCompetitionConfig(competition.config), bookings.map(row => ({ ...row, count: row._count._all }))) }, { headers: { "Cache-Control": "no-store" } })
}
