import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { hashPassword, verifyPassword, validatePassword } from "@/lib/range/auth"
import { dailyShiftTotals, dateField, normalizePhone, rangeDay } from "@/lib/range/shared"
import { assertSameOrigin, ownerOnly } from "@/lib/range/server"

describe("range credentials and boundaries", () => {
    it("splits overnight work at India midnight and rejects impossible dates", () => {
        expect(() => dateField("2026-02-30")).toThrow()
        expect(() => dateField("2026-99-99")).toThrow()
        const totals = dailyShiftTotals([{ userId: "c", inAt: "2026-10-01T23:00:00+05:30", outAt: "2026-10-02T01:00:00+05:30" }])
        expect(totals.map(t => [t.day, t.milliseconds])).toEqual([["2026-10-01", 3600000], ["2026-10-02", 3600000]])
    })
    it("normalizes Indian staff phones without changing international identities", () => {
        expect(normalizePhone("98765 43210")).toBe("+919876543210")
        expect(normalizePhone("+1 (604) 555-1234")).toBe("+16045551234")
        expect(() => normalizePhone("coach")).toThrow()
    })
    it("salts passwords and verifies exact characters", async () => {
        const first = await hashPassword("My strong password!")
        expect(first).not.toBe(await hashPassword("My strong password!"))
        expect(await verifyPassword("My strong password!", first)).toBe(true)
        expect(await verifyPassword("My strong password", first)).toBe(false)
        expect(() => validatePassword("12345678")).toThrow()
    })
    it("rejects cross-site and missing-origin mutations", () => {
        expect(() => assertSameOrigin(new NextRequest("https://salvo.test/api/range/staff"))).toThrow()
        expect(() => assertSameOrigin(new NextRequest("https://salvo.test/api/range/staff", { headers: { origin: "https://evil.test" } }))).toThrow()
        expect(() => assertSameOrigin(new NextRequest("https://salvo.test/api/range/staff", { headers: { origin: "https://salvo.test" } }))).not.toThrow()
    })
    it("requires an owner and uses the India business date", () => {
        expect(() => ownerOnly({ id: "c", role: "coach", name: "Coach", phone: "+919876543210", mustChangePassword: false })).toThrow()
        expect(rangeDay(new Date("2026-10-26T19:00:00Z"))).toBe("2026-10-27")
    })
})
