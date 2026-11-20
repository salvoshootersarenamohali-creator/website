import { DEFAULT_TEAM_ENTRY_FEE, Discipline, PaymentMode } from "@/lib/competition"
import { toProperCase } from "@/lib/registration-validation"

export const TEAM_ENTRY_FEE = DEFAULT_TEAM_ENTRY_FEE
export const MIXED_TEAM_ENTRY_FEE = 1500

export type TeamEntryType = "standard" | "mixed"

export function supportsMixedTeamEntries(competitionSlug: string) {
    return competitionSlug === "super-cup-2026"
}

export function getTeamEntryTypeLabel(teamType: string) {
    return teamType === "mixed" ? "Mixed Team" : "Standard Team"
}

export function getTeamEntryMemberCount(teamType: TeamEntryType) {
    return teamType === "mixed" ? 2 : 3
}

export function getTeamEntryFee(teamType: TeamEntryType, teamEntryFee = DEFAULT_TEAM_ENTRY_FEE) {
    return teamType === "mixed" ? MIXED_TEAM_ENTRY_FEE : teamEntryFee
}

export type IncomingTeamEntryMember = {
    registrationId: string
    registrationEntryId: string
}

export type IncomingTeamEntryData = {
    name: string
    teamType?: string
    discipline: string
    paymentMode: string
    paymentStatus: string
    members: IncomingTeamEntryMember[]
}

export type TeamValidationRegistration = {
    id: string
    competitionId: string
    name: string
    academy: string
    gender: string
    entries: {
        id: string
        discipline: string
        categoryCode: string
        categoryLabel: string
    }[]
}

export class TeamEntryValidationError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "TeamEntryValidationError"
    }
}

function validationError(message: string): never {
    throw new TeamEntryValidationError(message)
}

export function normalizeAcademyKey(value: string) {
    return value.trim().replace(/\s+/g, " ").toLowerCase()
}

export function getDisciplineLabel(discipline: Discipline) {
    return discipline === "pistol" ? "Pistol" : "Rifle"
}

export function normalizeTeamEntryData(data: Partial<IncomingTeamEntryData>): IncomingTeamEntryData {
    return {
        name: toProperCase(String(data.name ?? "").trim()),
        teamType: String(data.teamType ?? "standard").trim(),
        discipline: String(data.discipline ?? "").trim(),
        paymentMode: String(data.paymentMode ?? "cash").trim(),
        paymentStatus: String(data.paymentStatus ?? "Pending").trim(),
        members: Array.isArray(data.members) ? data.members : [],
    }
}

export function isTeamPaymentStatus(value: string) {
    return value === "Pending" || value === "Paid" || value === "Sponsored"
}

export function isTeamPaymentMode(value: string): value is PaymentMode {
    return value === "cash" || value === "upi"
}

export function resolveTeamEntry(
    data: IncomingTeamEntryData,
    competitionId: string,
    registrations: TeamValidationRegistration[],
    teamEntryFee = DEFAULT_TEAM_ENTRY_FEE,
    options: { mixedTeamsEnabled?: boolean } = {},
) {
    const teamType = data.teamType ?? "standard"
    if (teamType !== "standard" && teamType !== "mixed") {
        validationError("Select a standard team or mixed team entry.")
    }
    if (teamType === "mixed" && !options.mixedTeamsEnabled) {
        validationError("Mixed team entries are not enabled for this competition.")
    }
    const memberCount = getTeamEntryMemberCount(teamType)
    if (data.discipline !== "pistol" && data.discipline !== "rifle") {
        validationError("Select pistol or rifle for the team entry.")
    }
    const discipline = data.discipline as Discipline
    if (!isTeamPaymentMode(data.paymentMode)) {
        validationError("Payment method must be cash or online.")
    }
    if (!isTeamPaymentStatus(data.paymentStatus)) {
        validationError("Payment status must be Pending, Paid, or Sponsored.")
    }
    if (data.paymentMode === "upi" && data.paymentStatus === "Sponsored") {
        validationError("Sponsored team entries must use cash payment mode.")
    }
    if (data.members.length !== memberCount) {
        validationError(`A ${teamType === "mixed" ? "mixed team" : "team"} entry requires exactly ${memberCount} students.`)
    }

    const seenRegistrations = new Set<string>()
    const registrationMap = new Map(registrations.map((registration) => [registration.id, registration]))
    const resolvedMembers = data.members.map((member) => {
        const registrationId = String(member.registrationId ?? "").trim()
        const registrationEntryId = String(member.registrationEntryId ?? "").trim()
        const registration = registrationMap.get(registrationId)
        if (!registration) validationError("One or more selected students were not found.")
        if (registration.competitionId !== competitionId) validationError("One or more selected students are not registered for this competition.")
        if (seenRegistrations.has(registration.id)) validationError(`Choose ${memberCount} different students for a team entry.`)
        seenRegistrations.add(registration.id)

        const entry = registration.entries.find((candidate) => candidate.id === registrationEntryId)
        if (!entry) validationError(`${registration.name} does not have the selected individual entry.`)
        if (entry.discipline !== discipline) validationError(`${registration.name} must have an individual ${getDisciplineLabel(discipline)} entry.`)

        return { registration, entry }
    })

    if (teamType === "standard") {
        const academyKey = normalizeAcademyKey(resolvedMembers[0].registration.academy)
        if (!academyKey) validationError("Selected students must have a shooting club.")
        if (resolvedMembers.some((member) => normalizeAcademyKey(member.registration.academy) !== academyKey)) {
            validationError(`All ${memberCount} students must be from the same shooting club.`)
        }
    }
    if (teamType === "mixed" && (
        resolvedMembers.filter((member) => member.registration.gender === "male").length !== 1
        || resolvedMembers.filter((member) => member.registration.gender === "female").length !== 1
    )) {
        validationError("A mixed team requires one male and one female student.")
    }

    const academies = new Map(resolvedMembers.map((member) => [normalizeAcademyKey(member.registration.academy), member.registration.academy]))
    const academy = teamType === "mixed" ? [...academies.values()].join(" / ") : resolvedMembers[0].registration.academy
    const name = data.name || `${academy} ${getDisciplineLabel(discipline)} ${teamType === "mixed" ? "Mixed Team" : "Team"}`

    return {
        name,
        teamType,
        academy,
        discipline,
        amount: getTeamEntryFee(teamType, teamEntryFee),
        paymentMode: data.paymentMode,
        paymentStatus: data.paymentStatus,
        members: resolvedMembers,
    }
}
