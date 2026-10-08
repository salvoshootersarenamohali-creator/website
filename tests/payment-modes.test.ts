import { describe, expect, it } from "vitest"
import { defaultCompetitionConfig, getPaymentModeLabel, normalizeCompetitionConfig } from "@/lib/competition"
import { assertPublicPayment, getPaymentReferenceError } from "@/lib/registration-validation"

const bharatCupConfig = normalizeCompetitionConfig({
    ...defaultCompetitionConfig,
    allowedPaymentModes: ["upi", "neft", "imps", "rtgs"],
    paymentDetails: {
        upiId: "9315189722m@pnb",
        accountName: "NEXTZEN SPORTS",
        accountNumber: "2247002100003586",
        ifsc: "PUNB0224700",
        bankName: "Punjab National Bank",
    },
})

describe("Bharat Cup payment modes", () => {
    it("keeps the configured online methods and account details", () => {
        expect(bharatCupConfig.allowedPaymentModes).toEqual(["upi", "neft", "imps", "rtgs"])
        expect(bharatCupConfig.paymentDetails?.accountNumber).toBe("2247002100003586")
        expect(bharatCupConfig.allowedPaymentModes.map(getPaymentModeLabel)).toEqual(["UPI", "NEFT", "IMPS", "RTGS"])
    })

    it("rejects cash and requires a 12-digit UPI reference", () => {
        expect(() => assertPublicPayment({ paymentMode: "cash", utrNumber: "" }, bharatCupConfig)).toThrow("Please select a valid payment mode.")
        expect(getPaymentReferenceError("upi", "12345678901")).toBeTruthy()
        expect(() => assertPublicPayment({ paymentMode: "upi", utrNumber: "123456789012" }, bharatCupConfig)).not.toThrow()
    })

    it.each(["neft", "imps", "rtgs"])("accepts a %s transfer reference", (mode) => {
        expect(() => assertPublicPayment({ paymentMode: mode, utrNumber: "PUNBR5202610081234567890" }, bharatCupConfig)).not.toThrow()
        expect(() => assertPublicPayment({ paymentMode: mode, utrNumber: "" }, bharatCupConfig)).toThrow("Bank transfers require a transaction reference/UTR")
    })
})
