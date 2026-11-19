import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"

const db = vi.hoisted(() => ({ findUnique: vi.fn(), update: vi.fn(), authorized: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: { registrationEntry: { findUnique: db.findUnique, update: db.update } } }))
vi.mock("@/lib/admin", () => ({ isCompetitionAdminRequest: db.authorized, adminUnauthorized: () => Response.json({ error: "Unauthorized" }, { status: 401 }) }))
vi.mock("@/lib/competition-server", () => ({ getCompetitionBySlugOrActive: async () => ({ id: "super" }), getCompetitionSlugFromRequest: () => "super-cup-2026" }))

import { PATCH } from "@/app/api/admin/entries/[id]/score/route"
import { getScoringFormat } from "@/lib/competition"
import { isEntryScored } from "@/lib/results"

function save(body: unknown) {
    return PATCH(new NextRequest("http://localhost/api/admin/competitions/super-cup-2026/entries/test/score", { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ id: "test" }) })
}

beforeEach(() => {
    vi.clearAllMocks()
    db.authorized.mockResolvedValue(true)
    db.update.mockImplementation(async ({ data }) => ({ id: "test", ...await db.findUnique(), ...data }))
})

describe.each(["nr-25m-sports-pistol", "issf-25m-sports-pistol", "nr-25m-center-fire", "issf-25m-center-fire", "nr-50m-free-pistol", "issf-50m-free-pistol"])("%s score API", (eventId) => {
    const ruleSet = eventId.startsWith("issf") ? "ISSF" : "NR"
    const format = getScoringFormat(ruleSet, { eventId })
    beforeEach(() => db.findUnique.mockResolvedValue({ id: "test", eventId, ruleSet, categoryCode: "B-01", registration: { competitionId: "super" } }))

    it("saves and returns every series with an exact total, without requiring 10x", async () => {
        const seriesScores = Array(format.seriesCount).fill(String(format.maxSeriesScore))
        const response = await save({ seriesScores, totalScore: -1 })
        expect(response.status).toBe(200)
        const { entry } = await response.json()
        expect(entry.seriesScores).toEqual(seriesScores.map(Number))
        expect(entry.totalScore).toBe(format.maxTotalScore)
        expect(entry.innerTenCount).toBe(0)
        expect(isEntryScored(entry)).toBe(true)
        expect(db.update.mock.calls[0][0].data).toMatchObject({ shotScores: Prisma.JsonNull, seriesInnerTenCounts: Prisma.JsonNull })
    })

    it("accepts zero and ignores legacy inner-ten payloads", async () => {
        const response = await save({ seriesScores: Array(format.seriesCount).fill(0), innerTenCount: 99, seriesInnerTenCounts: Array(format.seriesCount).fill(10) })
        expect(response.status).toBe(200)
        expect((await response.json()).entry).toMatchObject({ totalScore: 0, innerTenCount: 0 })
    })

    it("rejects incomplete, excessive, decimal, invalid, and out-of-range scores without writing", async () => {
        for (const seriesScores of [Array(format.seriesCount - 1).fill(0), Array(format.seriesCount + 1).fill(0), ...["", null, true, 1.5, "45.0", -1, format.maxSeriesScore + 1].map((value) => [...Array(format.seriesCount - 1).fill(0), value])]) {
            expect((await save({ seriesScores })).status).toBe(400)
        }
        expect(db.update).not.toHaveBeenCalled()
    })
})

it("preserves legacy decimal scoring and the required inner-ten input", async () => {
    db.findUnique.mockResolvedValue({ id: "test", eventId: "issf-air-pistol", ruleSet: "ISSF", categoryCode: "S-01", registration: { competitionId: "super" } })
    expect((await save({ seriesScores: Array(6).fill("100.5") })).status).toBe(400)
    const response = await save({ seriesScores: Array(6).fill("100.5"), innerTenCount: "12" })
    expect(response.status).toBe(200)
    expect((await response.json()).entry).toMatchObject({ totalScore: 603, innerTenCount: 12 })
})

it("retains authorization and competition ownership checks", async () => {
    db.authorized.mockResolvedValueOnce(false)
    expect((await save({})).status).toBe(401)
    db.findUnique.mockResolvedValue({ registration: { competitionId: "other" } })
    expect((await save({})).status).toBe(404)
    expect(db.update).not.toHaveBeenCalled()
})
