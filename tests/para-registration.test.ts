import { describe, expect, it } from "vitest"
import { normalizeCompetitionConfig } from "@/lib/competition"
import {
    AUTOMATIC_PARA_SPONSOR,
    getParaPaymentTransition,
    getRegistrationParaState,
    priceRegistrationForParaStatus,
} from "@/lib/para-registration"

const entries = [
    { id: "one", eventId: "nr-air-rifle", categoryCode: "R-11", categoryLabel: "NR Air Rifle Senior Men", ruleSet: "NR", fee: 800 },
    { id: "two", eventId: "nr-air-rifle", categoryCode: "R-21", categoryLabel: "NR Air Rifle Sitting Under 12 Little Champ Boys", ruleSet: "NR", fee: 600 },
]

describe("para registration repricing", () => {
    it("recognizes regular, para, and legacy mixed shooter states", () => {
        expect(getRegistrationParaState([])).toBe("regular")
        expect(getRegistrationParaState([{ isPara: false }, { isPara: false }])).toBe("regular")
        expect(getRegistrationParaState([{ isPara: true }, { isPara: true }])).toBe("para")
        expect(getRegistrationParaState([{ isPara: true }, { isPara: false }])).toBe("mixed")
    })

    it("applies one custom para fee to every shooter entry", () => {
        const config = normalizeCompetitionConfig({
            feesByRuleSet: { NR: 800, ISSF: 1000 },
            littleChampEntryFee: 600,
            paraEntryMode: "custom-fee",
            paraEntryFee: 350,
        })
        const result = priceRegistrationForParaStatus(entries, config, true)

        expect(result.entries).toEqual([
            { id: "one", isPara: true, fee: 350 },
            { id: "two", isPara: true, fee: 350 },
        ])
        expect(result.amount).toBe(700)
        expect(result.automaticallySponsored).toBe(false)
    })

    it("sponsors every entry and restores current standard fees when para status is removed", () => {
        const config = normalizeCompetitionConfig({
            feesByRuleSet: { NR: 800, ISSF: 1000 },
            littleChampEntryFee: 600,
            paraEntryMode: "sponsored",
        })
        const sponsored = priceRegistrationForParaStatus(entries, config, true)
        const restored = priceRegistrationForParaStatus(entries, config, false)

        expect(sponsored.entries.map((entry) => entry.fee)).toEqual([0, 0])
        expect(sponsored.amount).toBe(0)
        expect(sponsored.automaticallySponsored).toBe(true)
        expect(restored.entries.map((entry) => entry.fee)).toEqual([800, 800])
        expect(restored.amount).toBe(1600)
    })

    it("automatically sponsors and only resets statuses created by the para policy", () => {
        const pending = { paymentMode: "upi", paymentStatus: "Paid", paymentConfirmedBy: "coach" }
        expect(getParaPaymentTransition(pending, true)).toEqual({
            paymentMode: "cash",
            paymentStatus: "Sponsored",
            utrNumber: null,
            paymentConfirmedBy: AUTOMATIC_PARA_SPONSOR,
            confirmNow: true,
        })
        expect(getParaPaymentTransition({ paymentMode: "cash", paymentStatus: "Sponsored", paymentConfirmedBy: AUTOMATIC_PARA_SPONSOR }, false)).toEqual({
            paymentStatus: "Pending",
            paymentConfirmedBy: null,
            paymentConfirmedAt: null,
            confirmNow: false,
        })
        expect(getParaPaymentTransition({ paymentMode: "cash", paymentStatus: "Sponsored", paymentConfirmedBy: "coach" }, false)).toBeNull()
    })
})
