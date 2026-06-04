import { RuleSet, slotOptions } from "./competition"

export type { RuleSet } from "./competition"

export type LaneType = "manual" | "electronic"

export type DetailLaneConfig = {
    manual: string[]
    electronic: string[]
}

export type DetailScheduleConfig = {
    date: string
    ruleSets: RuleSet[]
    lanes: DetailLaneConfig
    firstSightingTimes: Record<RuleSet, string>
}

export type DetailEntry = {
    id: string
    eventId: string
    eventTitle: string
    discipline: string
    ruleSet: string
    categoryCode: string
    categoryLabel: string
}

export type DetailRegistration = {
    id: string
    name: string
    academy: string
    preferredDate: string | Date
    preferredSlot: string
    createdAt: string | Date
    entries: DetailEntry[]
}

export type ScheduledDetailRow = {
    serial: number
    name: string
    matchNo: string
    academy: string
    laneNo: string
    eventTitle: string
    categoryLabel: string
    registrationId: string
    entryId: string
}

export type ScheduledDetail = {
    id: string
    detailNumber: number
    ruleSet: RuleSet
    laneType: LaneType
    date: string
    reportingTime: string
    sightingTime: string
    matchTime: string
    matchEndTime: string | null
    rows: ScheduledDetailRow[]
}

export type DetailSchedule = {
    date: string
    details: ScheduledDetail[]
    warnings: string[]
    totals: Record<RuleSet, number>
}

const DETAIL_INTERVAL_MINUTES: Record<RuleSet, number> = {
    NR: 80,
    ISSF: 105,
}

const MATCH_DURATION_MINUTES: Partial<Record<RuleSet, number>> = {
    ISSF: 75,
}

const REPORTING_OFFSET_MINUTES = 20
const MATCH_START_OFFSET_MINUTES = 15
const TEN_PM_MINUTES = 22 * 60

export const defaultDetailLanes: DetailLaneConfig = {
    manual: ["M1", "M2", "M3", "M4", "M5", "M6"],
    electronic: ["E1", "E2", "E3", "E4", "E5"],
}

export const defaultFirstSightingTimes: Record<RuleSet, string> = {
    NR: "08:30",
    ISSF: "08:30",
}

export function normalizeRuleSet(value: string): RuleSet {
    return value === "ISSF" ? "ISSF" : "NR"
}

export function dateOnly(value: string | Date) {
    if (value instanceof Date) return value.toISOString().slice(0, 10)
    return String(value).slice(0, 10)
}

export function formatDisplayDate(date: string) {
    const [year, month, day] = date.split("-").map(Number)
    if (!year || !month || !day) return date
    return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(year, month - 1, day))
}

export function getLaneType(ruleSet: RuleSet): LaneType {
    return ruleSet === "ISSF" ? "electronic" : "manual"
}

export function getLaneLabels(config: DetailLaneConfig, ruleSet: RuleSet) {
    return sanitizeLaneLabels(config[getLaneType(ruleSet)])
}

export function sanitizeLaneLabels(labels: string[]) {
    return labels.map((label) => label.trim()).filter(Boolean)
}

export function formatClock(minutes: number) {
    const dayMinutes = ((minutes % 1440) + 1440) % 1440
    const hours = Math.floor(dayMinutes / 60)
    const mins = dayMinutes % 60
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}

export function formatClockLabel(time: string) {
    const minutes = parseTimeToMinutes(time)
    if (minutes === null) return time
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    const suffix = hours >= 12 ? "PM" : "AM"
    const displayHour = hours % 12 || 12
    return `${displayHour}:${String(mins).padStart(2, "0")} ${suffix}`
}

export function parseTimeToMinutes(value: string) {
    const match = value.trim().match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return null

    const hours = Number(match[1])
    const minutes = Number(match[2])
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return null
    }

    return hours * 60 + minutes
}

function getSlotSortValue(slot: string) {
    const normalized = slot.trim()
    const knownSlots = slotOptions.flatMap((option) => option.slots)
    const knownIndex = knownSlots.indexOf(normalized)
    if (knownIndex >= 0) return knownIndex

    const match = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    if (!match) return Number.MAX_SAFE_INTEGER

    let hour = Number(match[1])
    const minute = Number(match[2])
    const suffix = match[3].toUpperCase()
    if (suffix === "PM" && hour !== 12) hour += 12
    if (suffix === "AM" && hour === 12) hour = 0
    return hour * 60 + minute
}

function categorySortValue(code: string) {
    const match = code.match(/^([A-Za-z]+)-(\d+)$/)
    return match ? `${match[1]}-${match[2].padStart(4, "0")}` : code
}

function buildCandidateRows(registrations: DetailRegistration[], date: string, ruleSet: RuleSet) {
    return registrations
        .filter((registration) => dateOnly(registration.preferredDate) === date)
        .flatMap((registration) =>
            registration.entries
                .filter((entry) => normalizeRuleSet(entry.ruleSet) === ruleSet)
                .map((entry) => ({
                    registration,
                    entry,
                }))
        )
        .sort((a, b) => {
            const slotDiff = getSlotSortValue(a.registration.preferredSlot) - getSlotSortValue(b.registration.preferredSlot)
            if (slotDiff !== 0) return slotDiff

            const categoryDiff = categorySortValue(a.entry.categoryCode).localeCompare(categorySortValue(b.entry.categoryCode))
            if (categoryDiff !== 0) return categoryDiff

            const createdDiff = new Date(a.registration.createdAt).getTime() - new Date(b.registration.createdAt).getTime()
            if (createdDiff !== 0) return createdDiff

            return a.registration.name.localeCompare(b.registration.name)
        })
}

export function buildDetailSchedule(registrations: DetailRegistration[], config: DetailScheduleConfig): DetailSchedule {
    const warnings: string[] = []
    const details: ScheduledDetail[] = []
    const totals: Record<RuleSet, number> = { NR: 0, ISSF: 0 }
    const selectedRuleSets: RuleSet[] = config.ruleSets.length ? config.ruleSets : ["NR", "ISSF"]

    selectedRuleSets.forEach((ruleSet) => {
        const lanes = getLaneLabels(config.lanes, ruleSet)
        if (!lanes.length) {
            warnings.push(`${ruleSet} was skipped because no ${getLaneType(ruleSet)} lanes are configured.`)
            return
        }

        const firstSighting = parseTimeToMinutes(config.firstSightingTimes[ruleSet] ?? defaultFirstSightingTimes[ruleSet])
        if (firstSighting === null) {
            warnings.push(`${ruleSet} was skipped because the first sighting time is invalid.`)
            return
        }

        const rows = buildCandidateRows(registrations, config.date, ruleSet)
        totals[ruleSet] = rows.length

        for (let index = 0; index < rows.length; index += lanes.length) {
            const detailNumber = Math.floor(index / lanes.length) + 1
            const sightingMinutes = firstSighting + (detailNumber - 1) * DETAIL_INTERVAL_MINUTES[ruleSet]
            const reportingMinutes = sightingMinutes - REPORTING_OFFSET_MINUTES
            const matchMinutes = sightingMinutes + MATCH_START_OFFSET_MINUTES
            const matchEndMinutes = MATCH_DURATION_MINUTES[ruleSet] ? matchMinutes + MATCH_DURATION_MINUTES[ruleSet] : null
            const detailRows = rows.slice(index, index + lanes.length).map(({ registration, entry }, rowIndex) => ({
                serial: rowIndex + 1,
                name: registration.name,
                matchNo: entry.categoryCode,
                academy: registration.academy,
                laneNo: lanes[rowIndex] ?? "",
                eventTitle: entry.eventTitle,
                categoryLabel: entry.categoryLabel,
                registrationId: registration.id,
                entryId: entry.id,
            }))

            details.push({
                id: `${ruleSet}-${detailNumber}`,
                detailNumber,
                ruleSet,
                laneType: getLaneType(ruleSet),
                date: config.date,
                reportingTime: formatClock(reportingMinutes),
                sightingTime: formatClock(sightingMinutes),
                matchTime: formatClock(matchMinutes),
                matchEndTime: matchEndMinutes === null ? null : formatClock(matchEndMinutes),
                rows: detailRows,
            })

            if (ruleSet === "ISSF" && matchEndMinutes !== null && matchEndMinutes > TEN_PM_MINUTES) {
                warnings.push(`ISSF detail ${detailNumber} ends after 10:00 PM.`)
            }
        }
    })

    return { date: config.date, details, warnings, totals }
}
