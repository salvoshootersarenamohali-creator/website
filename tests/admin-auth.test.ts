import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const { findUnique } = vi.hoisted(() => ({
    findUnique: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
    prisma: {
        competition: { findUnique },
    },
}))

import {
    createCompetitionAdminPinDigest,
    isCompetitionAdminRequest,
    validateCompetitionAdminPin,
} from "@/lib/admin"
import { defaultCompetitionConfig } from "@/lib/competition"
import { serializeCompetition } from "@/lib/competition-server"

function adminRequest(path: string, pin: string) {
    return new NextRequest(`https://salvoshootersarena.com${path}`, {
        headers: { "x-admin-pin": pin },
    })
}

describe("competition admin PINs", () => {
    beforeEach(() => {
        findUnique.mockReset()
        vi.stubEnv("ADMIN_PIN", "master-secret")
        vi.stubEnv("COMPETITION_PIN_SECRET", "stable-test-secret")
    })

    afterEach(() => {
        vi.unstubAllEnvs()
    })

    it("accepts only PINs containing four to eight digits", () => {
        expect(validateCompetitionAdminPin("0000")).toBeNull()
        expect(validateCompetitionAdminPin("12345678")).toBeNull()
        expect(validateCompetitionAdminPin("123")).toMatch(/4 to 8 digits/)
        expect(validateCompetitionAdminPin("123456789")).toMatch(/4 to 8 digits/)
        expect(validateCompetitionAdminPin("12a4")).toMatch(/4 to 8 digits/)
    })

    it("does not allow a competition PIN to reuse a numeric master PIN", () => {
        vi.stubEnv("ADMIN_PIN", "1234")
        expect(validateCompetitionAdminPin("1234")).toMatch(/different from the master PIN/)
        expect(validateCompetitionAdminPin("01234")).toBeNull()
    })

    it("creates deterministic digests while preserving leading zeros", () => {
        const first = createCompetitionAdminPinDigest("0123", "secret")
        expect(createCompetitionAdminPinDigest("0123", "secret")).toBe(first)
        expect(createCompetitionAdminPinDigest("123", "secret")).not.toBe(first)
        expect(createCompetitionAdminPinDigest("0123", "other-secret")).not.toBe(first)
    })

    it("never includes the PIN digest in public competition serialization", () => {
        const storedCompetition = {
            id: "competition-id",
            slug: "cup-one",
            title: "Cup One",
            shortTitle: "Cup One",
            description: null,
            venue: null,
            startDate: new Date("2026-10-02T00:00:00.000Z"),
            endDate: new Date("2026-10-03T00:00:00.000Z"),
            status: "open",
            isPublished: true,
            registrationOpen: true,
            resultsPublished: false,
            paymentQrPath: null,
            heroImagePath: null,
            adminPinDigest: createCompetitionAdminPinDigest("0123"),
            config: defaultCompetitionConfig,
        }

        expect(serializeCompetition(storedCompetition)).not.toHaveProperty("adminPinDigest")
    })

    it("allows the master PIN on both scoped and legacy unscoped routes", async () => {
        await expect(isCompetitionAdminRequest(adminRequest(
            "/api/admin/competitions/cup-one/registrations",
            "master-secret",
        ))).resolves.toBe(true)
        await expect(isCompetitionAdminRequest(adminRequest(
            "/api/admin/registrations",
            "master-secret",
        ))).resolves.toBe(true)
        expect(findUnique).not.toHaveBeenCalled()
    })

    it("allows a competition PIN only on its matching scoped route", async () => {
        findUnique.mockResolvedValue({
            adminPinDigest: createCompetitionAdminPinDigest("0123"),
        })

        await expect(isCompetitionAdminRequest(adminRequest(
            "/api/admin/competitions/cup-one/registrations",
            "0123",
        ))).resolves.toBe(true)
        expect(findUnique).toHaveBeenCalledWith({
            where: { slug: "cup-one" },
            select: { adminPinDigest: true },
        })

        await expect(isCompetitionAdminRequest(adminRequest(
            "/api/admin/competitions/cup-one/registrations",
            "5678",
        ))).resolves.toBe(false)
    })

    it("rejects competition PINs on unscoped routes and for competitions without a PIN", async () => {
        await expect(isCompetitionAdminRequest(adminRequest(
            "/api/admin/registrations",
            "0123",
        ))).resolves.toBe(false)
        expect(findUnique).not.toHaveBeenCalled()

        findUnique.mockResolvedValue({ adminPinDigest: null })
        await expect(isCompetitionAdminRequest(adminRequest(
            "/api/admin/competitions/legacy-cup/registrations",
            "0123",
        ))).resolves.toBe(false)
    })
})
