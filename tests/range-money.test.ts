import { describe, expect, it } from "vitest"
import { formatMoney, paise, parseMoney } from "@/lib/range/money"
import { normalizeFinance } from "@/lib/range/finance"
import { rangeDay } from "@/lib/range/shared"
describe("range money validation", () => {
    it("parses rupees exactly without floating point rounding", () => {
        expect(parseMoney("950.25")).toBe(95025)
        expect(parseMoney("0.10")).toBe(10)
        expect(parseMoney("-50.05", true)).toBe(-5005)
        expect(() => parseMoney("1.234")).toThrow()
        expect(() => parseMoney("-1")).toThrow()
        expect(() => paise(1.5)).toThrow()
        expect(formatMoney(95000)).toContain("950")
    })
    it("requires split payments and sale calculations to match the amount", () => {
        const base = { locationId: "a", kind: "income", amountPaise: 95000, occurredOn: rangeDay(), categoryId: "sale", description: "Pellets", productId: "p", quantity: 1, unitPricePaise: 95000, payments: [{ accountId: "cash", method: "cash", amountPaise: 50000 }, { accountId: "bank", method: "online", amountPaise: 45000 }] }
        expect(normalizeFinance(base).amountPaise).toBe(95000)
        expect(() => normalizeFinance({ ...base, amountPaise: 95001 })).toThrow()
        expect(() => normalizeFinance({ ...base, quantity: 2 })).toThrow()
    })
})
