import type { CompetitionConfig } from "@/lib/competition"
import type { Relay, RelayPool } from "@/lib/relay-config"

export type BookedRegistration = {
    id: string; name: string; academy: string; paymentStatus: string
    entries: { categoryCode: string; categoryLabel: string }[]
    relayBooking?: { date: string; relayId: string; pool: string; lane: number } | null
}
export type BookedDetail = {
    date: string; relay: Relay; pool: RelayPool; capacity: number; booked: number; remaining: number
    rows: { registrationId: string; lane: number; name: string; academy: string; categories: string; paymentStatus: string }[]
}

export function buildBookedDetails(registrations: BookedRegistration[], config: CompetitionConfig, date: string): BookedDetail[] {
    const day = config.relayBooking.days.find((d) => d.date === date)
    return (day?.relays ?? []).flatMap((relay) => (["standard", "special"] as const).map((pool) => {
        const capacity = pool === "standard" ? config.relayBooking.standardCapacity : config.relayBooking.specialCapacity
        const rows = registrations.filter((r) => r.relayBooking?.date === date && r.relayBooking.relayId === relay.id && r.relayBooking.pool === pool).map((r) => ({
            registrationId: r.id, lane: r.relayBooking!.lane, name: r.name, academy: r.academy,
            categories: r.entries.map((entry) => `${entry.categoryCode} ${entry.categoryLabel}`).join("; "), paymentStatus: r.paymentStatus,
        })).sort((a, b) => a.lane - b.lane)
        return { date, relay, pool, capacity, booked: rows.length, remaining: Math.max(0, capacity - rows.length), rows }
    }))
}
