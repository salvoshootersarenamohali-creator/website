import {
    CompetitionConfig,
    Gender,
    PaymentMode,
    defaultCompetitionConfig,
    getAgeFromDobYear,
    getEligibleCategories,
    getEntryFee,
    getEventById,
} from "@/lib/competition"

export type IncomingRegistrationEntry = {
    eventId: string
    categoryCode: string
}

export type IncomingRegistrationData = {
    name: string
    academy: string
    gender: string
    dateOfBirth: string
    phone: string
    preferredDate: string
    preferredSlot: string
    paymentMode: string
    utrNumber: string
    entries: IncomingRegistrationEntry[]
}

export type ResolvedRegistrationEntry = {
    eventId: string
    eventTitle: string
    discipline: string
    ruleSet: string
    categoryCode: string
    categoryLabel: string
    fee: number
}

export class RegistrationValidationError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "RegistrationValidationError"
    }
}

function validationError(message: string): never {
    throw new RegistrationValidationError(message)
}

export function cleanPhone(phone: string) {
    return phone.replace(/[^\d+]/g, "")
}

export function toProperCase(value: string) {
    return value
        .toLowerCase()
        .replace(/(^|[\s(/&-])([a-z])([a-z']*)/g, (_, prefix: string, first: string, rest: string) => `${prefix}${first.toUpperCase()}${rest}`)
}

export function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message
    if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string"
    ) {
        return (error as { message: string }).message
    }
    return fallback
}

export function isValidDate(value: string) {
    return !Number.isNaN(new Date(value).getTime())
}

export function normalizeRegistrationData(data: Partial<IncomingRegistrationData>): IncomingRegistrationData {
    return {
        name: toProperCase(String(data.name ?? "").trim()),
        academy: toProperCase(String(data.academy ?? "").trim()),
        gender: String(data.gender ?? "").trim(),
        dateOfBirth: String(data.dateOfBirth ?? "").trim(),
        phone: cleanPhone(String(data.phone ?? "").trim()),
        preferredDate: String(data.preferredDate ?? "").trim(),
        preferredSlot: String(data.preferredSlot ?? "").trim(),
        paymentMode: String(data.paymentMode ?? "").trim(),
        utrNumber: String(data.utrNumber ?? "").trim(),
        entries: Array.isArray(data.entries) ? data.entries : [],
    }
}

export function resolveRegistrationEntries(data: IncomingRegistrationData, config: CompetitionConfig = defaultCompetitionConfig): ResolvedRegistrationEntry[] {
    if (!data.name || !data.academy || !data.gender || !data.dateOfBirth || !data.phone || !data.preferredDate || !data.preferredSlot || !data.paymentMode) {
        validationError("Please complete all required fields.")
    }
    if (data.gender !== "male" && data.gender !== "female") {
        validationError("Please select a valid gender.")
    }
    if (!isValidDate(data.dateOfBirth) || !isValidDate(data.preferredDate)) {
        validationError("Please enter valid dates.")
    }
    if (data.paymentMode !== "cash" && data.paymentMode !== "upi") {
        validationError("Please select a valid payment mode.")
    }
    const selectedDay = config.slotOptions.find((slot) => slot.date === data.preferredDate)
    if (!selectedDay || !selectedDay.slots.includes(data.preferredSlot)) {
        validationError("Please select a valid relay date and time slot.")
    }
    if (!data.entries.length) {
        validationError("Please select at least one event category.")
    }

    const age = getAgeFromDobYear(data.dateOfBirth, config.competitionYear)
    if (age === null) {
        validationError("Date of birth is invalid.")
    }

    const seenEntries = new Set<string>()
    const resolvedEntries = data.entries.map((entry) => {
        const eventId = String(entry.eventId ?? "").trim()
        const categoryCode = String(entry.categoryCode ?? "").trim()
        const key = `${eventId}:${categoryCode}`
        if (seenEntries.has(key)) validationError("Each event category can only be selected once.")
        seenEntries.add(key)

        const event = getEventById(eventId, config)
        if (!event) validationError("Selected event is invalid.")
        const category = getEligibleCategories(event, age, data.gender as Gender).find((item) => item.code === categoryCode)
        if (!category) validationError("One or more selected categories are not eligible for this shooter.")

        return {
            eventId: event.id,
            eventTitle: event.title,
            discipline: event.discipline,
            ruleSet: event.ruleSet,
            categoryCode: category.code,
            categoryLabel: category.label,
            fee: getEntryFee(category, config),
        }
    })

    const disciplines = new Set(resolvedEntries.map((entry) => entry.discipline))
    if (disciplines.size > 1) {
        validationError("Choose either pistol or rifle categories, not both.")
    }

    return resolvedEntries
}

export function getResolvedRegistrationAmount(entries: ResolvedRegistrationEntry[]) {
    return entries.reduce((sum, entry) => sum + entry.fee, 0)
}

export function assertPublicPayment(data: Pick<IncomingRegistrationData, "paymentMode" | "utrNumber">) {
    if (data.paymentMode === "upi" && !/^\d{12}$/.test(data.utrNumber)) {
        validationError("UPI payments require a 12-digit UTR/UPI reference number.")
    }
}

export function isPaymentMode(value: string): value is PaymentMode {
    return value === "cash" || value === "upi"
}
