import type { RuleSet } from "@/lib/competition"

export type RelayPool = "standard" | "special"
export type Relay = {
    id: string
    number: number
    ruleSet: RuleSet
    reportingTime: string
    preparationTime: string
    startTime: string
    endTime: string
}
export type RelayBookingConfig = {
    enabled: boolean
    standardCapacity: number
    specialCapacity: number
    specialEventIds: string[]
    days: { date: string; relays: Relay[] }[]
}
export type CertificateConfig = {
    issuerName: string
    logoPath: string | null
    signers: { id: string; name: string; designation: string; imagePath: string | null }[]
}

export const defaultRelayBooking: RelayBookingConfig = {
    enabled: false, standardCapacity: 13, specialCapacity: 3, specialEventIds: [], days: [],
}

export const dailyRelayTemplate: Relay[] = [
    ["07:30", "07:45", "08:00", "09:15"], ["09:15", "09:30", "09:45", "10:35"],
    ["10:35", "10:50", "11:05", "12:20"], ["12:20", "12:35", "12:50", "13:40"],
    ["13:40", "13:55", "14:10", "15:25"], ["15:25", "15:40", "15:55", "16:45"],
    ["16:45", "17:00", "17:15", "18:30"], ["18:30", "18:45", "19:00", "19:50"],
    ["19:50", "20:05", "20:20", "21:35"],
].map((times, index) => ({ id: `relay-${index + 1}`, number: index + 1, ruleSet: index % 2 === 0 ? "ISSF" : "NR", reportingTime: times[0], preparationTime: times[1], startTime: times[2], endTime: times[3] }))

export function normalizeRelayBooking(value: unknown): RelayBookingConfig {
    const raw = value && typeof value === "object" ? value as Partial<RelayBookingConfig> : {}
    return {
        enabled: raw.enabled === true,
        standardCapacity: Number.isInteger(raw.standardCapacity) && Number(raw.standardCapacity) > 0 ? Number(raw.standardCapacity) : 13,
        specialCapacity: Number.isInteger(raw.specialCapacity) && Number(raw.specialCapacity) > 0 ? Number(raw.specialCapacity) : 3,
        specialEventIds: Array.isArray(raw.specialEventIds) ? raw.specialEventIds.map(String) : [],
        days: Array.isArray(raw.days) ? raw.days.map((day) => ({
            date: String(day.date),
            relays: Array.isArray(day.relays) ? day.relays.map((relay) => ({
                id: String(relay.id), number: Number(relay.number), ruleSet: relay.ruleSet === "ISSF" ? "ISSF" : "NR",
                reportingTime: String(relay.reportingTime), preparationTime: String(relay.preparationTime),
                startTime: String(relay.startTime), endTime: String(relay.endTime),
            })) : [],
        })) : [],
    }
}

export function normalizeCertificate(value: unknown): CertificateConfig | null {
    if (!value || typeof value !== "object") return null
    const raw = value as Partial<CertificateConfig>
    return {
        issuerName: String(raw.issuerName ?? "").trim(),
        logoPath: raw.logoPath ? String(raw.logoPath) : null,
        signers: Array.isArray(raw.signers) ? raw.signers.slice(0, 3).map((s) => ({
            id: String(s.id), name: String(s.name ?? "").trim(), designation: String(s.designation ?? "").trim(),
            imagePath: s.imagePath ? String(s.imagePath) : null,
        })) : [],
    }
}

export function validateRelayConfiguration(value: unknown, start: string, end: string) {
    const raw = value && typeof value === "object" ? value as Record<string, unknown> : {}
    const cert = raw.certificate as CertificateConfig | undefined
    if (cert && (typeof cert.issuerName !== "string" || !cert.issuerName.trim() || !Array.isArray(cert.signers) || cert.signers.length > 3 || cert.signers.some((s) => !s || typeof s.id !== "string" || !s.id || typeof s.name !== "string" || !s.name.trim()))) return "Certificates need an issuer name and no more than three named signers."
    const relayRaw = raw.relayBooking as RelayBookingConfig | undefined
    if (relayRaw?.enabled) {
        if (![relayRaw.standardCapacity, relayRaw.specialCapacity].every((n) => Number.isInteger(n) && n >= 1 && n <= 100)) return "Lane capacity must be between 1 and 100."
        if (!Array.isArray(relayRaw.days) || relayRaw.days.some((d) => !d || !Array.isArray(d.relays) || d.relays.some((r) => !r || !r.id || (r.ruleSet !== "NR" && r.ruleSet !== "ISSF")))) return "Every relay needs a valid ID and an NR or ISSF rule set."
    }
    const config = normalizeRelayBooking(raw.relayBooking)
    if (!config.enabled) return null
    if (config.standardCapacity > 100 || config.specialCapacity > 100) return "Lane capacity must be between 1 and 100."
    if (!config.days.some((day) => day.relays.length)) return "Add at least one bookable relay day."
    const dates = new Set<string>()
    for (const day of config.days) {
        const parsed = new Date(`${day.date}T00:00:00Z`)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day.date || day.date < start || day.date > end || dates.has(day.date)) return "Relay dates must be unique and within the competition dates."
        dates.add(day.date)
        const ids = new Set<string>()
        const numbers = new Set<number>()
        for (const relay of day.relays) {
            const times = [relay.reportingTime, relay.preparationTime, relay.startTime, relay.endTime]
            if (!relay.id || ids.has(relay.id) || numbers.has(relay.number) || !Number.isInteger(relay.number) || relay.number < 1 || times.some((t) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(t))) return "Every relay needs a unique ID, number, and valid times."
            if (!(times[0] <= times[1] && times[1] < times[2] && times[2] < times[3])) return "Relay times must follow reporting, preparation, start, and end order."
            ids.add(relay.id)
            numbers.add(relay.number)
        }
    }
    return null
}

export function relayLabel(relay: Relay) {
    return `Relay ${relay.number} (${relay.ruleSet}) ${relay.startTime} - ${relay.endTime}`
}
