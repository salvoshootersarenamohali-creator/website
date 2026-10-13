import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { buildRelayAvailability, getBookingEligibility, getSelectedBookingEligibility, lowestAvailableLane, RelayCapacityError, resolveRelaySelection } from "@/lib/relay-booking"
import { getEntryFee, normalizeCompetitionConfig, validateCashPrizeConfiguration } from "@/lib/competition"
import { buildBookedDetails } from "@/lib/booked-details"
import { validateRelayConfiguration } from "@/lib/relay-config"

export function nehraConfig() {
    const sql = readFileSync("prisma/migrations/20261012010000_add_nehra_memorial/migration.sql", "utf8")
    return normalizeCompetitionConfig(JSON.parse(sql.match(/'(\{[\s\S]*\})'::jsonb/)![1]))
}
const config = nehraConfig()
const nr = { eventId: "nr-air-rifle", ruleSet: "NR", categoryCode: "R-11", categoryLabel: "NR Air Rifle Senior Men" }
const issf = { eventId: "issf-air-rifle", ruleSet: "ISSF", categoryCode: "R-01", categoryLabel: "ISSF Air Rifle Senior Men" }
const little = { ...nr, categoryCode: "R-19", categoryLabel: "NR Air Rifle Little Champ Boys" }
const open = { ...nr, eventId: "open-sight-rifle", categoryCode: "OS-01", categoryLabel: "Open Sight Rifle Men" }

describe("controlled relay bookings", () => {
    it("preserves opt-in behavior for legacy competitions", () => { expect(normalizeCompetitionConfig({}).relayBooking.enabled).toBe(false) })
    it("uses NR for NR-only and ISSF for mixed standard entries", () => {
        expect(getBookingEligibility([nr], config)).toEqual({ pool: "standard", ruleSet: "NR" })
        expect(getBookingEligibility([nr, issf], config)).toEqual({ pool: "standard", ruleSet: "ISSF" })
        expect(() => resolveRelaySelection("2026-11-01", "relay-1", [nr], config)).toThrow("Choose an NR relay")
        expect(resolveRelaySelection("2026-11-01", "relay-1", [nr, issf], config).capacity).toBe(13)
    })
    it("resolves form selections from eligible categories rather than colliding legacy category codes", () => {
        expect(getSelectedBookingEligibility([{ eventId: "issf-air-rifle", categoryCode: "R-01" }], config, "2000-01-01", "male")).toEqual({ pool: "standard", ruleSet: "ISSF" })
        expect(getSelectedBookingEligibility([{ eventId: "nr-air-rifle", categoryCode: "R-19" }], config, "2016-01-01", "male")).toEqual({ pool: "special", ruleSet: null })
    })
    it("allows special shooters in any relay and rejects mixed pools", () => {
        expect(resolveRelaySelection("2026-11-01", "relay-1", [little], config)).toMatchObject({ pool: "special", capacity: 3 })
        expect(resolveRelaySelection("2026-11-01", "relay-2", [open, little], config).pool).toBe("special")
        expect(() => getBookingEligibility([nr, little], config)).toThrow("separately")
    })
    it("never offers finals day and corrects the last relay to 75 minutes", () => {
        expect(() => resolveRelaySelection("2026-11-06", "relay-1", [issf], config)).toThrow("valid relay")
        expect(config.relayBooking.days).toHaveLength(5)
        expect(config.relayBooking.days[0].relays.at(-1)?.endTime).toBe("21:35")
        expect(validateRelayConfiguration(config, "2026-11-01", "2026-11-06")).toBeNull()
    })
    it("rejects invalid capacities, duplicate relays, and malformed certificate signers", () => {
        expect(validateRelayConfiguration({ ...config, relayBooking: { ...config.relayBooking, standardCapacity: 0 } }, "2026-11-01", "2026-11-06")).toContain("Lane capacity")
        const days = [{ ...config.relayBooking.days[0], relays: [config.relayBooking.days[0].relays[0], config.relayBooking.days[0].relays[0]] }]
        expect(validateRelayConfiguration({ ...config, relayBooking: { ...config.relayBooking, days } }, "2026-11-01", "2026-11-06")).toContain("unique")
        expect(validateRelayConfiguration({ certificate: { issuerName: "Club", signers: [null] } }, "2026-11-01", "2026-11-06")).toContain("named signers")
    })
    it("assigns the lowest free lane and enforces both capacities", () => {
        expect(lowestAvailableLane([3, 1], 3)).toBe(2)
        expect(() => lowestAvailableLane([1, 2, 3], 3)).toThrow(RelayCapacityError)
        expect(() => lowestAvailableLane(Array.from({ length: 13 }, (_, i) => i + 1), 13)).toThrow(RelayCapacityError)
    })
    it("keeps pools independent and never returns personal data", () => {
        const availability = buildRelayAvailability(config, [{ date: "2026-11-01", relayId: "relay-1", pool: "standard" }])
        expect(availability[0]).toMatchObject({ standard: { booked: 1, remaining: 12 }, special: { booked: 0, remaining: 3 } })
        expect(Object.keys(availability[0])).toEqual(["date", "relayId", "standard", "special"])
    })
    it("retains all eight prize places and exact competition fees", () => {
        expect(config.cashPrizeGroups[0].prizes).toEqual([11000, 7100, 5100, 2100, 1100, 1100, 1100, 1100])
        expect(config.cashPrizeGroups[2].prizes).toEqual([7100, 5100, 4100, 2100, 1100, 1100, 1100, 1100])
        expect(validateCashPrizeConfiguration(config)).toBeNull()
        expect(getEntryFee(issf, config)).toBe(1200)
        expect(getEntryFee(little, config)).toBe(1000)
        expect(getEntryFee(open, config)).toBe(1000)
    })
    it("prints a multi-category shooter once and includes empty relays", () => {
        const details = buildBookedDetails([{ id: "one", name: "Shooter", academy: "Club", paymentStatus: "Paid", entries: [nr, issf], relayBooking: { date: "2026-11-01", relayId: "relay-1", pool: "standard", lane: 5 } }], config, "2026-11-01")
        expect(details).toHaveLength(18)
        expect(details[0]).toMatchObject({ booked: 1, remaining: 12, rows: [{ lane: 5 }] })
        expect(details[0].rows[0].categories).toContain("R-11")
        expect(details[0].rows[0].categories).toContain("R-01")
        expect(details[1]).toMatchObject({ booked: 0, remaining: 3 })
    })
})
