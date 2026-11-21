import { Prisma } from "@prisma/client"
import { prisma } from "./prisma"
import type { CompetitionConfig } from "./competition"

export const rosterPageSize = 40

export async function loadRosterPage(competitionId: string, config: CompetitionConfig, params: URLSearchParams) {
    const requested = Number(params.get("page") ?? 1)
    const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, 1_000_000) : 1
    const query = params.get("q")?.trim() ?? ""
    const filter = params.get("filter") ?? "all"
    const date = params.get("date") ?? "all"
    const where = [Prisma.sql`r."competitionId" = ${competitionId}`]
    if (date !== "all") where.push(Prisma.sql`to_char(r."preferredDate", 'YYYY-MM-DD') = ${date}`)
    if (filter !== "all") where.push(Prisma.sql`(r."paymentStatus" = ${filter} OR EXISTS (
        SELECT 1 FROM "RegistrationEntry" e WHERE e."registrationId" = r.id AND (e."ruleSet" = ${filter} OR e.discipline = ${filter})))`)
    if (query) where.push(Prisma.sql`strpos(lower(concat_ws(' ', r.name, r.academy, r."coachName", r.phone,
        (SELECT string_agg(concat_ws(' ', e."eventTitle", e."categoryCode"), ' ' ORDER BY e."createdAt") FROM "RegistrationEntry" e
         WHERE e."registrationId" = r.id))), lower(${query})) > 0`)
    const conditions = Prisma.join(where, " AND ")
    const dates = config.slotOptions.map(day => day.date)
    const slots = config.slotOptions.flatMap(day => day.slots.map(slot => day.date + "|" + slot))
    const [count] = await prisma.$queryRaw<{ total: number }[]>`SELECT COUNT(*)::int AS total FROM "Registration" r WHERE ${conditions}`
    const current = Math.min(page, Math.max(1, Math.ceil(count.total / rosterPageSize)))
    const rows = await prisma.$queryRaw<RosterRow[]>`SELECT r.id, r.name, r.academy, r."coachName", r."paymentStatus", r.amount, r."isService",
        r."preferredDate", r."preferredSlot", (r."studentPhotoPath" IS NOT NULL) AS "hasPhoto",
        (SELECT count(*)::int FROM "RegistrationEntry" e WHERE e."registrationId" = r.id) AS "entryCount"
        FROM "Registration" r WHERE ${conditions}
        ORDER BY array_position(${dates}::text[], to_char(r."preferredDate", 'YYYY-MM-DD')) NULLS LAST,
        COALESCE(r."preferredDate", '-infinity'::timestamp), array_position(${slots}::text[], to_char(r."preferredDate", 'YYYY-MM-DD') || '|' || r."preferredSlot") NULLS LAST,
        r."preferredSlot", r.name, r."createdAt" DESC, r.id LIMIT ${rosterPageSize} OFFSET ${(current - 1) * rosterPageSize}`
    return { rows, total: count.total, page: current, pages: Math.max(1, Math.ceil(count.total / rosterPageSize)) }
}

export type RosterRow = {
    id: string; name: string; academy: string; coachName: string | null; paymentStatus: string; amount: number
    preferredDate: string | null; preferredSlot: string; hasPhoto: boolean; entryCount: number
    isService: boolean
}

export async function loadRegistrationSummary(competitionId: string) {
    const [payments, entries] = await Promise.all([
        prisma.registration.groupBy({ by: ["paymentStatus"], where: { competitionId }, _count: { _all: true }, _sum: { amount: true } }),
        prisma.registrationEntry.count({ where: { registration: { competitionId } } }),
    ])
    const count = (status: string) => payments.find(row => row.paymentStatus === status)?._count._all ?? 0
    return { registrations: payments.reduce((n, row) => n + row._count._all, 0), entries, paid: count("Paid"),
        pending: count("Pending"), sponsored: count("Sponsored"), collected: payments.find(row => row.paymentStatus === "Paid")?._sum.amount ?? 0 }
}
