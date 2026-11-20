import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import * as XLSX from "xlsx"

const db = vi.hoisted(() => ({
    authorized: vi.fn(), competition: vi.fn(), registrations: vi.fn(),
    create: vi.fn(), teams: vi.fn(), findTeam: vi.fn(), deleteTeam: vi.fn(),
}))
vi.mock("@/lib/admin", () => ({ isCompetitionAdminRequest: db.authorized, adminUnauthorized: () => Response.json({ error: "Unauthorized" }, { status: 401 }) }))
vi.mock("@/lib/prisma", () => ({ prisma: {
    registration: { findMany: db.registrations },
    teamEntry: { create: db.create, findMany: db.teams, findUnique: db.findTeam, delete: db.deleteTeam },
} }))
vi.mock("@/lib/competition-server", () => ({
    getCompetitionBySlugOrActive: db.competition,
    getCompetitionSlugFromRequest: () => "super-cup-2026",
    competitionFilePrefix: () => "super-cup-2026",
}))

import { GET, POST } from "@/app/api/admin/competitions/[slug]/team-entries/route"
import { DELETE } from "@/app/api/admin/competitions/[slug]/team-entries/[id]/route"
import { GET as exportEntries } from "@/app/api/admin/export/route"
import { defaultCompetitionConfig } from "@/lib/competition"

const competition = { id: "super", slug: "super-cup-2026", config: { ...defaultCompetitionConfig, teamEntryFee: 1200 } }
const students = ["male", "female"].map((gender, index) => ({
    id: `student-${index}`, competitionId: "super", name: `Shooter ${index}`, gender, academy: `Club ${index}`,
    entries: [{ id: `entry-${index}`, discipline: "pistol", categoryCode: `S-${index}`, categoryLabel: `Category ${index}` }],
}))
const teamData = {
    name: "Mixed Pair", teamType: "mixed", discipline: "pistol", paymentMode: "cash", paymentStatus: "Paid",
    members: students.map((student) => ({ registrationId: student.id, registrationEntryId: student.entries[0].id })),
}
const context = { params: Promise.resolve({ slug: competition.slug }) }
function request(body?: unknown) {
    return new NextRequest(`http://localhost/api/admin/competitions/${competition.slug}/team-entries`, {
        method: body === undefined ? "GET" : "POST",
        ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    })
}

beforeEach(() => {
    vi.resetAllMocks()
    db.authorized.mockResolvedValue(true)
    db.competition.mockResolvedValue(competition)
    db.registrations.mockResolvedValue(students)
    db.create.mockImplementation(async ({ data }) => ({ id: "team-1", ...data }))
    db.teams.mockResolvedValue([])
})

describe("Super Cup mixed team API", () => {
    it.each(["cash", "upi"])("saves the type, both clubs, 1500 mixed fee and individual entry links for %s payments", async (paymentMode) => {
        const response = await POST(request({ ...teamData, paymentMode, amount: 1 }), context)
        expect(response.status).toBe(200)
        expect((await response.json()).teamEntry).toMatchObject({
            teamType: "mixed", academy: "Club 0 / Club 1", amount: 1500,
        })
        expect(db.create.mock.calls[0][0].data).toMatchObject({
            competitionId: "super", teamType: "mixed", members: { create: teamData.members },
        })
        expect(db.registrations).toHaveBeenCalledWith(expect.objectContaining({
            where: { competitionId: "super", id: { in: ["student-0", "student-1"] } },
        }))
    })

    it("returns saved mixed and standard teams in the competition list", async () => {
        const teams = [{ id: "mixed", teamType: "mixed" }, { id: "standard", teamType: "standard" }]
        db.teams.mockResolvedValue(teams)
        const response = await GET(request(), context)
        expect(await response.json()).toEqual({ teamEntries: teams })
        expect(db.teams).toHaveBeenCalledWith(expect.objectContaining({ where: { competitionId: "super" } }))
    })

    it("rejects same-gender pairs without saving", async () => {
        db.registrations.mockResolvedValue(students.map((student) => ({ ...student, gender: "male" })))
        const response = await POST(request(teamData), context)
        expect(response.status).toBe(400)
        expect((await response.json()).error).toContain("one male and one female")
        expect(db.create).not.toHaveBeenCalled()
    })

    it("rejects different disciplines without saving", async () => {
        db.registrations.mockResolvedValue(students.map((student, index) => ({ ...student, entries: [{ ...student.entries[0], discipline: index ? "rifle" : "pistol" }] })))
        const response = await POST(request(teamData), context)
        expect(response.status).toBe(400)
        expect(db.create).not.toHaveBeenCalled()
    })

    it("rejects a member unavailable in this competition", async () => {
        db.registrations.mockResolvedValue(students.slice(0, 1))
        expect((await POST(request(teamData), context)).status).toBe(400)
        expect(db.create).not.toHaveBeenCalled()
    })

    it("rejects mixed teams for other competitions and disabled team entries", async () => {
        db.competition.mockResolvedValueOnce({ ...competition, slug: "other-cup" })
        expect((await POST(request(teamData), context)).status).toBe(400)
        db.competition.mockResolvedValueOnce({ ...competition, config: { ...competition.config, teamEntriesEnabled: false } })
        expect((await POST(request(teamData), context)).status).toBe(400)
        expect(db.create).not.toHaveBeenCalled()
    })

    it("requires admin authorization to create or list teams", async () => {
        db.authorized.mockResolvedValue(false)
        expect((await POST(request(teamData), context)).status).toBe(401)
        expect((await GET(request(), context)).status).toBe(401)
        expect(db.competition).not.toHaveBeenCalled()
        expect(db.create).not.toHaveBeenCalled()
    })

    it("deletes a mixed entry and enforces competition ownership", async () => {
        const deleteContext = { params: Promise.resolve({ slug: competition.slug, id: "team-1" }) }
        db.findTeam.mockResolvedValueOnce({ id: "team-1", competitionId: "other", name: "Other team" })
        expect((await DELETE(request(), deleteContext)).status).toBe(404)
        expect(db.deleteTeam).not.toHaveBeenCalled()
        db.findTeam.mockResolvedValueOnce({ id: "team-1", competitionId: "super", name: "Mixed Pair" })
        expect((await DELETE(request(), deleteContext)).status).toBe(200)
        expect(db.deleteTeam).toHaveBeenCalledWith({ where: { id: "team-1" } })
    })

    it("exports the mixed type, both members and their clubs without a third member", async () => {
        db.registrations.mockResolvedValue([])
        db.teams.mockResolvedValue([{
            ...teamData, academy: "Club 0 / Club 1", amount: 1500, createdAt: new Date("2026-11-19"),
            members: students.map((registration) => ({ registration, registrationEntry: registration.entries[0] })),
        }])
        const response = await exportEntries(request())
        expect(response.status).toBe(200)
        const workbook = XLSX.read(await response.arrayBuffer(), { type: "array" })
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets["Team Entries"])
        expect(rows[0]).toMatchObject({
            "Team Type": "Mixed Team", "Member 1": "Shooter 0", "Member 1 Gender": "male", "Member 1 Club": "Club 0",
            "Member 2": "Shooter 1", "Member 2 Gender": "female", "Member 2 Club": "Club 1", "Member 3": "",
        })
        expect((rows[0] as Record<string, unknown>).Amount).toBe("Rs. 1,500 (Cash - Paid)")
    })
})
