import { getPaymentModeLabel, type Discipline, type PaymentMode } from "@/lib/competition"
import type { TeamEntryType } from "@/lib/team-entries"
import { UNRECORDED_PAYMENT } from "@/lib/bharat-cup"

export type PaymentStatus = "Pending" | "Paid" | "Sponsored"
export type RegistrationPaymentStatus = PaymentStatus | typeof UNRECORDED_PAYMENT

export type AdminEntry = {
    id: string
    eventId: string
    eventTitle: string
    discipline: string
    ruleSet: string
    categoryCode: string
    categoryLabel: string
    fee: number
    seriesScores: (number | null)[] | null
    shotScores: number[] | null
    seriesInnerTenCounts: number[] | null
    innerTenCount: number
    totalScore: number | null
    isPara: boolean
    bharatCupResult?: { flaggedSeriesTwo: number | null } | null
}

export type AdminRegistration = {
    isService: boolean
    relayBooking?: { date: string; relayId: string; pool: string; lane: number } | null
    batchId?: string | null
    id: string
    name: string
    academy: string
    coachName: string | null
    motherName: string | null
    fatherName: string | null
    gender: string
    dateOfBirth: string | null
    phone: string
    address: string | null
    preferredDate: string | null
    preferredSlot: string
    paymentMode: PaymentMode | ""
    paymentStatus: RegistrationPaymentStatus
    paymentConfirmedBy: string | null
    paymentConfirmedAt: string | null
    amount: number
    utrNumber: string | null
    screenshotPath: string | null
    studentPhotoPath: string | null
    birthCertificatePath: string | null
    aadhaarCardPath: string | null
    documents: {
        id: string
        documentKey: string
        label: string
        path: string
        mimeType: string
    }[]
    createdAt: string
    entries: AdminEntry[]
}

export type AdminTeamEntry = {
    id: string
    name: string
    teamType: TeamEntryType
    academy: string
    discipline: Discipline
    amount: number
    paymentMode: PaymentMode
    paymentStatus: PaymentStatus
    createdAt: string
    members: {
        id: string
        registration: AdminRegistration
        registrationEntry: AdminEntry
    }[]
}

export function scopedAdminPath(competitionSlug: string, path: string) {
    return `/api/admin/competitions/${competitionSlug}${path}`
}

export function paymentModeLabel(mode: PaymentMode | "") {
    return mode ? getPaymentModeLabel(mode) : UNRECORDED_PAYMENT
}

export async function readResponseJson(response: Response) {
    const text = await response.text()
    if (!text) return {}

    try {
        return JSON.parse(text) as Record<string, unknown>
    } catch {
        return { error: text }
    }
}
