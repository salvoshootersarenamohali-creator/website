import { CompetitionConfig, getRegistrationEntryFee } from "@/lib/competition"

export const AUTOMATIC_PARA_SPONSOR = "Para sponsorship"

export type ParaRegistrationEntry = {
    id: string
    eventId: string
    categoryCode: string
    categoryLabel: string
    ruleSet: string
    fee: number
}

export type ParaPaymentState = {
    paymentMode: string
    paymentStatus: string
    paymentConfirmedBy: string | null
}

export function getRegistrationParaState(entries: { isPara: boolean }[]) {
    if (!entries.length || entries.every((entry) => !entry.isPara)) return "regular" as const
    if (entries.every((entry) => entry.isPara)) return "para" as const
    return "mixed" as const
}

export function priceRegistrationForParaStatus(
    entries: ParaRegistrationEntry[],
    config: CompetitionConfig,
    isPara: boolean,
) {
    const pricedEntries = entries.map((entry) => ({
        id: entry.id,
        isPara,
        fee: getRegistrationEntryFee(entry, config, isPara),
    }))

    return {
        entries: pricedEntries,
        amount: pricedEntries.reduce((sum, entry) => sum + entry.fee, 0),
        automaticallySponsored: isPara && config.paraEntryMode === "sponsored" && pricedEntries.length > 0,
    }
}

export function getParaPaymentTransition(
    state: ParaPaymentState,
    automaticallySponsored: boolean,
) {
    if (automaticallySponsored) {
        return {
            paymentMode: "cash" as const,
            paymentStatus: "Sponsored" as const,
            utrNumber: null,
            paymentConfirmedBy: AUTOMATIC_PARA_SPONSOR,
            confirmNow: true,
        }
    }

    if (state.paymentStatus === "Sponsored" && state.paymentConfirmedBy === AUTOMATIC_PARA_SPONSOR) {
        return {
            paymentStatus: "Pending" as const,
            paymentConfirmedBy: null,
            paymentConfirmedAt: null,
            confirmNow: false,
        }
    }

    return null
}
