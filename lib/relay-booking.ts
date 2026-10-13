import { getAgeFromDobYear, getEligibleCategories, isLittleChampCategory, type CompetitionConfig, type Gender, type SelectedEntry } from "@/lib/competition"
import { RegistrationValidationError } from "@/lib/registration-validation"
import { relayLabel, type RelayPool } from "@/lib/relay-config"

type Entry = { eventId: string; ruleSet: string; categoryCode: string; categoryLabel: string }

export class RelayCapacityError extends Error {
    constructor() {
        super("This relay has just filled up. Please choose another available relay.")
        this.name = "RelayCapacityError"
    }
}

export function getBookingEligibility(entries: Entry[], config: CompetitionConfig): { pool: RelayPool; ruleSet: "NR" | "ISSF" | null } {
    const special = entries.map((entry) => config.relayBooking.specialEventIds.includes(entry.eventId) || isLittleChampCategory(entry))
    if (special.some(Boolean) && special.some((v) => !v)) throw new RegistrationValidationError("Register standard events and Little Champ/Open Sight events separately.")
    if (special.length && special.every(Boolean)) return { pool: "special", ruleSet: null }
    return { pool: "standard", ruleSet: entries.some((e) => e.ruleSet === "ISSF") ? "ISSF" : "NR" }
}

export function getSelectedBookingEligibility(entries: SelectedEntry[], config: CompetitionConfig, dateOfBirth: string, gender: string) {
    const age = getAgeFromDobYear(dateOfBirth, config.competitionYear)
    if (age === null || (gender !== "male" && gender !== "female")) throw new RegistrationValidationError("Enter date of birth and gender to select eligible categories.")
    return getBookingEligibility(entries.map((entry) => {
        const event = config.events.find((e) => e.id === entry.eventId)
        const category = event && getEligibleCategories(event, age, gender as Gender, config).find((c) => c.code === entry.categoryCode)
        if (!event || !category) throw new RegistrationValidationError("One or more selected categories are not eligible for this shooter.")
        return { ...entry, ruleSet: event.ruleSet, categoryLabel: category.label }
    }), config)
}

export function resolveRelaySelection(date: string, relayId: string, entries: Entry[], config: CompetitionConfig) {
    const eligibility = getBookingEligibility(entries, config)
    const relay = config.relayBooking.days.find((day) => day.date === date)?.relays.find((item) => item.id === relayId || relayLabel(item) === relayId)
    if (!relay) throw new RegistrationValidationError("Please select a valid relay date and time.")
    if (eligibility.ruleSet && relay.ruleSet !== eligibility.ruleSet) throw new RegistrationValidationError(`Choose an ${eligibility.ruleSet} relay for these entries.`)
    const capacity = eligibility.pool === "special" ? config.relayBooking.specialCapacity : config.relayBooking.standardCapacity
    return { date, relayId: relay.id, pool: eligibility.pool, capacity, relay, label: relayLabel(relay) }
}

export function lowestAvailableLane(occupied: number[], capacity: number) {
    const taken = new Set(occupied)
    for (let lane = 1; lane <= capacity; lane++) if (!taken.has(lane)) return lane
    throw new RelayCapacityError()
}

export type RelayAvailability = {
    date: string
    relayId: string
    standard: { booked: number; remaining: number; capacity: number }
    special: { booked: number; remaining: number; capacity: number }
}

export function buildRelayAvailability(config: CompetitionConfig, bookings: { date: string; relayId: string; pool: string }[]): RelayAvailability[] {
    return config.relayBooking.days.flatMap((day) => day.relays.map((relay) => {
        const count = (pool: RelayPool) => bookings.filter((b) => b.date === day.date && b.relayId === relay.id && b.pool === pool).length
        const pool = (name: RelayPool, capacity: number) => ({ booked: count(name), remaining: Math.max(0, capacity - count(name)), capacity })
        return { date: day.date, relayId: relay.id, standard: pool("standard", config.relayBooking.standardCapacity), special: pool("special", config.relayBooking.specialCapacity) }
    }))
}
