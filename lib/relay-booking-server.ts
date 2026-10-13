import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { lowestAvailableLane, resolveRelaySelection } from "@/lib/relay-booking"
import { normalizeCompetitionConfig, type CompetitionConfig } from "@/lib/competition"

export class RelayConfigurationConflict extends Error {}

export async function assertBookingConfigurationChange(tx: Prisma.TransactionClient, competitionId: string, config: CompetitionConfig) {
    const competition = await tx.competition.findUniqueOrThrow({ where: { id: competitionId } })
    const previous = normalizeCompetitionConfig(competition.config)
    const booked = await tx.registrationRelayBooking.findMany({ where: { competitionId }, include: { registration: { include: { entries: true } } } })
    for (const booking of booked) {
        if (!config.relayBooking.enabled) throw new RelayConfigurationConflict("Move or remove existing reservations before disabling relay booking.")
        const oldRelay = previous.relayBooking.days.find((day) => day.date === booking.date)?.relays.find((r) => r.id === booking.relayId)
        const nextRelay = config.relayBooking.days.find((day) => day.date === booking.date)?.relays.find((r) => r.id === booking.relayId)
        if (JSON.stringify(oldRelay) !== JSON.stringify(nextRelay)) throw new RelayConfigurationConflict("A booked relay cannot be removed or have its times/type changed. Move its shooters first.")
        try {
            const selection = resolveRelaySelection(booking.date, booking.relayId, booking.registration.entries, config)
            if (selection.pool !== booking.pool || selection.capacity < booking.lane) throw new Error()
        } catch { throw new RelayConfigurationConflict("These lane/category changes would invalidate an existing booking.") }
    }
}

export async function serializableTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
        try {
            return await prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 })
        } catch (error) {
            const code = error && typeof error === "object" && "code" in error ? error.code : null
            if (attempt >= 9 || (code !== "P2034" && code !== "P2002")) throw error
            await new Promise((resolve) => setTimeout(resolve, Math.min(25 * 2 ** attempt, 500) + Math.random() * 50))
        }
    }
}

export async function reserveRelay(tx: Prisma.TransactionClient, competitionId: string, registrationId: string, selection: ReturnType<typeof resolveRelaySelection>) {
    const existing = await tx.registrationRelayBooking.findUnique({ where: { registrationId } })
    if (existing && existing.competitionId === competitionId && existing.date === selection.date && existing.relayId === selection.relayId && existing.pool === selection.pool && existing.lane <= selection.capacity) return existing
    const occupied = await tx.registrationRelayBooking.findMany({
        where: { competitionId, date: selection.date, relayId: selection.relayId, pool: selection.pool, registrationId: { not: registrationId } },
        select: { lane: true },
    })
    const lane = lowestAvailableLane(occupied.map((b) => b.lane), selection.capacity)
    return tx.registrationRelayBooking.upsert({
        where: { registrationId },
        create: { registrationId, competitionId, date: selection.date, relayId: selection.relayId, pool: selection.pool, lane },
        update: { date: selection.date, relayId: selection.relayId, pool: selection.pool, lane },
    })
}
