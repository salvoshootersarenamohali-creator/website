import { createHash, randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { BHARAT_CUP_SLUG, UNRECORDED_PAYMENT, bharatCupEntryKey } from "@/lib/bharat-cup"
import { BharatCupImportError, normalizeBharatCupMatchCode, type BharatCupWorkbookRow } from "@/lib/bharat-cup-workbook"
import { getCompetitionCategories, normalizeCompetitionConfig } from "@/lib/competition"

export async function importBharatCupResults(tx: Prisma.TransactionClient, rows: BharatCupWorkbookRow[], confirmedPreview?: string) {
    const competition = await tx.competition.findUnique({ where: { slug: BHARAT_CUP_SLUG } })
    if (!competition) throw new BharatCupImportError("First Bharat Cup is missing from this database.")
    const config = normalizeCompetitionConfig(competition.config)
    const existing = await tx.registrationEntry.findMany({
        where: { registration: { competitionId: competition.id } },
        select: {
            id: true, categoryCode: true, seriesScores: true, shotScores: true, seriesInnerTenCounts: true, totalScore: true, innerTenCount: true,
            registration: { select: { name: true, academy: true } },
            bharatCupResult: { select: { matchDate: true, sourceRow: true, sourceDigest: true } },
        },
    })
    const imported = new Map<string, NonNullable<typeof existing[number]["bharatCupResult"]>>()
    const candidates = new Map<string, typeof existing>()
    for (const entry of existing) {
        if (entry.bharatCupResult) {
            const { matchDate, sourceRow } = entry.bharatCupResult
            imported.set(`${matchDate.toISOString().slice(0, 10)}:${sourceRow}`, entry.bharatCupResult)
            continue
        }
        const code = normalizeBharatCupMatchCode(entry.categoryCode)
        if (!code) continue
        const key = bharatCupEntryKey(entry.registration.name, entry.registration.academy, code)
        const matches = candidates.get(key) ?? []
        matches.push(entry)
        candidates.set(key, matches)
    }

    const summary = { total: rows.length, updated: 0, created: 0, skipped: 0 }
    const work = rows.flatMap((row) => {
        const location = `${row.matchDate} row ${row.sourceRow}`
        const previous = imported.get(`${row.matchDate}:${row.sourceRow}`)
        if (previous) {
            if (previous.sourceDigest !== row.sourceDigest) throw new BharatCupImportError(`The workbook differs from the imported copy at ${location}.`)
            summary.skipped++
            return []
        }
        const matches = candidates.get(bharatCupEntryKey(row.name, row.academy, row.categoryCode)) ?? []
        const match = matches.length === 1 ? matches[0] : undefined
        if (match) {
            const hasScore = match.totalScore !== null || match.innerTenCount > 0
                || [match.seriesScores, match.shotScores, match.seriesInnerTenCounts].some((scores) => Array.isArray(scores) && scores.length > 0)
            if (hasScore && (match.totalScore !== row.totalScore || match.innerTenCount !== row.innerTenCount
                || JSON.stringify(match.seriesScores) !== JSON.stringify(row.seriesScores))) {
                throw new BharatCupImportError(`An existing entry has a different score at ${location}. Review it before importing.`)
            }
            summary.updated++
        } else {
            summary.created++
        }
        return [{ row, matchId: match?.id }]
    })
    const preview = createHash("sha256").update(JSON.stringify(work.map(({ row, matchId }) => [row.sourceDigest, matchId]))).digest("hex")
    if (confirmedPreview === undefined || !work.length) return { ...summary, preview }
    if (confirmedPreview !== preview) throw new BharatCupImportError("Entries changed after the preview. Preview the workbook again.")

    const categories = new Map(config.events.flatMap((event) => getCompetitionCategories(event)
        .map((category) => [category.code, { event, label: category.label }] as const)))
    const registrations: Prisma.RegistrationCreateManyInput[] = []
    const entries: Prisma.RegistrationEntryCreateManyInput[] = []
    const provenance: Prisma.BharatCupRecordedResultCreateManyInput[] = []
    for (const { row, matchId } of work) {
        const scores = { seriesScores: row.seriesScores, totalScore: row.totalScore, innerTenCount: row.innerTenCount }
        const entryId = matchId ?? randomUUID()
        if (matchId) {
            await tx.registrationEntry.update({ where: { id: matchId }, data: scores })
        } else {
            const registrationId = randomUUID()
            const discipline = row.categoryCode.startsWith("S-") ? "pistol" : "rifle"
            const category = categories.get(row.categoryCode)
            registrations.push({
                id: registrationId, competitionId: competition.id, name: row.name, academy: row.academy,
                gender: "", phone: "", preferredSlot: "", paymentMode: "", paymentStatus: UNRECORDED_PAYMENT, amount: 0,
            })
            entries.push({
                id: entryId, registrationId, ...scores, categoryCode: row.categoryCode, discipline, fee: 0,
                // Unlisted workbook matches use the existing integer-score display for these records.
                ruleSet: category?.event.ruleSet ?? "NR",
                eventId: category?.event.id ?? `nr-air-${discipline}`,
                eventTitle: category?.event.title ?? (discipline === "pistol" ? "Air Pistol" : "Air Rifle"),
                categoryLabel: category?.label ?? `Match ${row.categoryCode}`,
            })
        }
        provenance.push({
            entryId, matchDate: new Date(row.matchDate + "T00:00:00.000Z"), sourceRow: row.sourceRow,
            sourceDigest: row.sourceDigest, reportedMatch: row.reportedMatch, flaggedSeriesTwo: row.flaggedSeriesTwo,
            didNotFinish: row.didNotFinish ?? false,
        })
    }
    if (registrations.length) await tx.registration.createMany({ data: registrations })
    if (entries.length) await tx.registrationEntry.createMany({ data: entries })
    await tx.bharatCupRecordedResult.createMany({ data: provenance })
    await tx.competition.update({ where: { id: competition.id }, data: { resultsPublished: true } })
    return { ...summary, preview }
}
