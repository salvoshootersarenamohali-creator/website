import { describe, expect, it } from "vitest"
import { defaultCompetitionConfig, getAgeFromDobYear, getEligibleCategories, normalizeCompetitionConfig } from "@/lib/competition"
import { normalizeRegistrationData, resolveRegistrationEntries } from "@/lib/registration-validation"

describe("separate coach name for competition registration", () => {
    it("requires a coach name only when the competition enables it", () => {
        const config = normalizeCompetitionConfig({ ...defaultCompetitionConfig, requiresCoachName: true })
        const event = config.events[0]
        const dateOfBirth = "2000-01-01"
        const age = getAgeFromDobYear(dateOfBirth, config.competitionYear)!
        const category = getEligibleCategories(event, age, "male", config)[0]
        const data = normalizeRegistrationData({
            name: "Test Shooter",
            academy: "Range Academy",
            gender: "male",
            dateOfBirth,
            phone: "9876543210",
            preferredDate: config.slotOptions[0].date,
            preferredSlot: config.slotOptions[0].slots[0],
            paymentMode: "upi",
            entries: [{ eventId: event.id, categoryCode: category.code }],
        })

        expect(() => resolveRegistrationEntries(data, config)).toThrow("Please enter the coach name.")
        expect(resolveRegistrationEntries(data, { ...config, requiresCoachName: false })).toHaveLength(1)

        const withCoach = normalizeRegistrationData({ ...data, coachName: "  jAnE dOE " })
        expect(withCoach.coachName).toBe("Jane Doe")
        expect(resolveRegistrationEntries(withCoach, config)).toHaveLength(1)
    })
})

it("allows staff to retain a booked slot after it closes to new registrations", () => {
    const day = defaultCompetitionConfig.slotOptions[0]
    const config = normalizeCompetitionConfig({
        ...defaultCompetitionConfig,
        slotOptions: [{ ...day, slots: [] }, ...defaultCompetitionConfig.slotOptions.slice(1)],
    })
    const event = config.events[0]
    const dateOfBirth = "2000-01-01"
    const age = getAgeFromDobYear(dateOfBirth, config.competitionYear)!
    const category = getEligibleCategories(event, age, "male", config)[0]
    const bookedSlot = { preferredDate: day.date, preferredSlot: day.slots[0] }
    const data = normalizeRegistrationData({
        name: "Test Shooter",
        academy: "Range Academy",
        gender: "male",
        dateOfBirth,
        phone: "9876543210",
        paymentMode: "upi",
        entries: [{ eventId: event.id, categoryCode: category.code }],
        ...bookedSlot,
    })

    expect(() => resolveRegistrationEntries(data, config)).toThrow("Please select a valid relay date and time slot.")
    expect(resolveRegistrationEntries(data, config, bookedSlot)).toHaveLength(1)
    expect(() => resolveRegistrationEntries({ ...data, preferredSlot: day.slots[1] }, config, bookedSlot))
        .toThrow("Please select a valid relay date and time slot.")
})
