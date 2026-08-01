import { categorySortValue, isEntryScored, rankRows, ResultEntryLike } from "@/lib/results"

export type MedalType = "gold" | "silver" | "bronze"

export type ParticipantSourceEntry = ResultEntryLike & {
    id: string
    eventId: string
    eventTitle: string
    categoryLabel: string
    isPara: boolean
}

export type ParticipantSourceRegistration = {
    id: string
    name: string
    academy: string
    entries: ParticipantSourceEntry[]
}

export type ParticipantEntry = {
    entryId: string
    eventId: string
    eventTitle: string
    categoryCode: string
    categoryLabel: string
    isPara: boolean
    rank: number
    positionLabel: string
    medal: MedalType | null
}

export type DirectoryParticipant = {
    registrationId: string
    shooterName: string
    academy: string
    entries: ParticipantEntry[]
    medalCount: number
    bestMedal: MedalType | null
    certificateUrl: string
}

export type ParticipantCategoryRow = DirectoryParticipant & {
    categoryEntry: ParticipantEntry
}

export type ParticipantCategory = {
    key: string
    code: string
    label: string
    isPara: boolean
    participantCount: number
    participants: ParticipantCategoryRow[]
}

export type ParticipantDirectory = {
    uniqueParticipantCount: number
    categoryCount: number
    participants: DirectoryParticipant[]
    categories: ParticipantCategory[]
    regularCategories: ParticipantCategory[]
    paraCategories: ParticipantCategory[]
}

type RankedCategory = {
    key: string
    code: string
    label: string
    isPara: boolean
    rows: ReturnType<typeof rankRows<ParticipantSourceRegistration, ParticipantSourceEntry>>
}

const medalPriority: Record<MedalType, number> = {
    gold: 3,
    silver: 2,
    bronze: 1,
}

export function medalForRank(rank: number | null): MedalType | null {
    if (rank === 1) return "gold"
    if (rank === 2) return "silver"
    if (rank === 3) return "bronze"
    return null
}

export function formatPosition(rank: number) {
    if (rank % 100 >= 11 && rank % 100 <= 13) return `${rank}th`
    if (rank % 10 === 1) return `${rank}st`
    if (rank % 10 === 2) return `${rank}nd`
    if (rank % 10 === 3) return `${rank}rd`
    return `${rank}th`
}

function participantEntrySort(a: ParticipantEntry, b: ParticipantEntry) {
    if (a.isPara !== b.isPara) return a.isPara ? 1 : -1
    const categoryDifference = categorySortValue(a.categoryCode).localeCompare(categorySortValue(b.categoryCode))
    if (categoryDifference !== 0) return categoryDifference
    return a.eventTitle.localeCompare(b.eventTitle)
}

function bestMedal(entries: ParticipantEntry[]) {
    return entries.reduce<MedalType | null>((best, entry) => {
        if (!entry.medal) return best
        if (!best || medalPriority[entry.medal] > medalPriority[best]) return entry.medal
        return best
    }, null)
}

export function buildParticipantDirectory(
    registrations: ParticipantSourceRegistration[],
    competitionSlug: string,
): ParticipantDirectory {
    const groups = new Map<string, {
        key: string
        code: string
        label: string
        isPara: boolean
        rows: { registration: ParticipantSourceRegistration; entry: ParticipantSourceEntry }[]
    }>()

    registrations.forEach((registration) => {
        registration.entries.filter(isEntryScored).forEach((entry) => {
            const key = `${entry.isPara ? "para" : "regular"}:${entry.categoryCode}`
            const group = groups.get(key) ?? {
                key,
                code: entry.categoryCode,
                label: entry.categoryLabel,
                isPara: entry.isPara,
                rows: [],
            }
            group.rows.push({ registration, entry })
            groups.set(key, group)
        })
    })

    const rankedCategories: RankedCategory[] = Array.from(groups.values())
        .sort((a, b) => {
            if (a.isPara !== b.isPara) return a.isPara ? 1 : -1
            return categorySortValue(a.code).localeCompare(categorySortValue(b.code))
        })
        .map((category) => ({ ...category, rows: rankRows(category.rows) }))

    const entriesByRegistration = new Map<string, ParticipantEntry[]>()
    rankedCategories.forEach((category) => {
        category.rows.forEach((row) => {
            if (!row.rank) return
            const entry: ParticipantEntry = {
                entryId: row.entry.id,
                eventId: row.entry.eventId,
                eventTitle: row.entry.eventTitle,
                categoryCode: row.entry.categoryCode,
                categoryLabel: row.entry.categoryLabel,
                isPara: row.entry.isPara,
                rank: row.rank,
                positionLabel: formatPosition(row.rank),
                medal: medalForRank(row.rank),
            }
            const participantEntries = entriesByRegistration.get(row.registration.id) ?? []
            participantEntries.push(entry)
            entriesByRegistration.set(row.registration.id, participantEntries)
        })
    })

    const participants = registrations
        .filter((registration) => entriesByRegistration.has(registration.id))
        .map<DirectoryParticipant>((registration) => {
            const entries = [...(entriesByRegistration.get(registration.id) ?? [])].sort(participantEntrySort)
            const medalCount = entries.filter((entry) => entry.medal).length
            return {
                registrationId: registration.id,
                shooterName: registration.name,
                academy: registration.academy,
                entries,
                medalCount,
                bestMedal: bestMedal(entries),
                certificateUrl: `/api/competitions/${encodeURIComponent(competitionSlug)}/participants/${encodeURIComponent(registration.id)}/certificate`,
            }
        })
        .sort((a, b) => a.shooterName.localeCompare(b.shooterName))

    const participantById = new Map(participants.map((participant) => [participant.registrationId, participant]))
    const categories = rankedCategories.map<ParticipantCategory>((category) => {
        const rows = category.rows
            .map((row) => {
                const participant = participantById.get(row.registration.id)
                const categoryEntry = participant?.entries.find((entry) => entry.entryId === row.entry.id)
                return participant && categoryEntry ? { ...participant, categoryEntry } : null
            })
            .filter((row): row is ParticipantCategoryRow => Boolean(row))
            .sort((a, b) => a.shooterName.localeCompare(b.shooterName))

        return {
            key: category.key,
            code: category.code,
            label: category.label,
            isPara: category.isPara,
            participantCount: rows.length,
            participants: rows,
        }
    })

    return {
        uniqueParticipantCount: participants.length,
        categoryCount: categories.length,
        participants,
        categories,
        regularCategories: categories.filter((category) => !category.isPara),
        paraCategories: categories.filter((category) => category.isPara),
    }
}
