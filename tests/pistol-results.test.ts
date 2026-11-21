import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import * as XLSX from "xlsx"

vi.mock("next/cache", () => ({ unstable_cache: (load: () => unknown) => load }))

const db = vi.hoisted(() => ({ registrations: vi.fn(), teams: vi.fn(), competition: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: { registration: { findMany: db.registrations }, teamEntry: { findMany: db.teams } } }))
vi.mock("@/lib/admin", () => ({ isCompetitionAdminRequest: async () => true, adminUnauthorized: () => Response.json({}, { status: 401 }) }))
vi.mock("@/lib/competition-server", () => ({ getCompetitionBySlugOrActive: db.competition, getCompetitionSlugFromRequest: () => "super-cup-2026", serializeCompetition: (value: unknown) => value, competitionFilePrefix: () => "super-cup-2026" }))

import { GET as results } from "@/app/api/results/route"
import { GET as categoryExport } from "@/app/api/admin/results/export/route"
import { GET as registrationExport } from "@/app/api/admin/export/route"
import { defaultCompetitionConfig, getScoringFormat } from "@/lib/competition"
import { getRuleSet } from "@/lib/results"

function shooter(eventId: string, categoryCode: string, isPara = false) {
    const ruleSet = eventId.startsWith("issf") ? "ISSF" : "NR"
    const format = getScoringFormat(ruleSet, { eventId })
    // Distinct values expose any series truncation or stage-order mistakes.
    const seriesScores = Array.from({ length: format.seriesCount }, (_, index) => format.maxSeriesScore - index)
    return {
        id: categoryCode + String(isPara), name: `Shooter ${categoryCode}`, academy: "Test Academy", coachName: "Test Coach",
        motherName: null, fatherName: null, address: null, phone: "9000000000", dateOfBirth: null, gender: "male",
        preferredDate: null, preferredSlot: "", paymentMode: "cash", paymentStatus: "Paid", amount: 1000,
        paymentConfirmedAt: null, paymentConfirmedBy: null, documents: [], studentPhotoPath: null,
        entries: [{ id: categoryCode + String(isPara), eventId, eventTitle: eventId, ruleSet, categoryCode, categoryLabel: "Senior Men", seriesScores, totalScore: seriesScores.reduce((a, b) => a + b, 0), innerTenCount: 20, isPara }],
    }
}

let revision = 0
beforeEach(() => {
    vi.clearAllMocks()
    db.competition.mockResolvedValue({ id: "super", updatedAt: new Date(++revision), slug: "super-cup-2026", isPublished: true, registrationOpen: true, resultsPublished: true, config: defaultCompetitionConfig })
    db.teams.mockResolvedValue([])
})

it("ranks registered team entries by type and discipline, keeping exact ties and pending rosters", async () => {
    const scored = (id: string, total: number, discipline = "pistol") => {
        const student = shooter(`issf-air-${discipline}`, discipline === "rifle" ? "R-01" : "S-01")
        const entry = { ...student.entries[0], id, totalScore: total, seriesScores: [total, 0, 0, 0, 0, 0] }
        return { ...student, name: id, entries: [entry] }
    }
    const students = [scored("A", 80.1), scored("B", 90.2), scored("C", 0), scored("D", 80.2),
        scored("E", 90.1), scored("F", 20), scored("G", 0, "rifle"), scored("H", 0, "rifle")]
    // A has another event with a higher score. Only the registered entry counts.
    students[0].entries.push({ ...students[0].entries[0], id: "unused-entry", totalScore: 600, seriesScores: Array(6).fill(100) })
    students[5].entries[0].seriesScores = []
    db.registrations.mockResolvedValue(students)
    const team = (id: string, teamType: string, discipline: string, entries: string[]) => ({
        id, name: id, academy: "Club", teamType, discipline, members: entries.map(registrationEntryId => ({ registrationEntryId })),
    })
    db.teams.mockResolvedValue([
        team("Standard", "standard", "pistol", ["A", "B", "C"]),
        team("Pair A", "mixed", "pistol", ["A", "B"]), team("Pair B", "mixed", "pistol", ["D", "E"]),
        team("Pair C", "mixed", "pistol", ["A", "C"]), team("Pending", "mixed", "pistol", ["A", "F"]),
        team("Rifle", "mixed", "rifle", ["G", "H"]),
    ])
    const response = await results(new NextRequest("http://localhost/api/competitions/super-cup-2026/results"))
    expect(response.status).toBe(200)
    const { teamStandings } = await response.json()
    expect(db.teams).toHaveBeenCalledWith(expect.objectContaining({ where: { competitionId: "super" } }))
    expect(teamStandings).toMatchObject([
        { teamType: "standard", discipline: "pistol", rows: [{ rank: 1, totalScore: 170.3 }] },
        { teamType: "mixed", discipline: "pistol", rows: [
            { id: "Pair A", rank: 1, totalScore: 170.3 }, { id: "Pair B", rank: 1, totalScore: 170.3 },
            { id: "Pair C", rank: 3, totalScore: 80.1 },
            { id: "Pending", rank: null, totalScore: null, members: [{ name: "A", score: "80.1" }, { name: "F", score: null }] },
        ] },
        { teamType: "mixed", discipline: "rifle", rows: [{ rank: 1, totalScore: 0 }] },
    ])
})

describe.each(["nr-25m-sports-pistol", "issf-25m-sports-pistol", "nr-25m-center-fire", "issf-25m-center-fire", "nr-25m-standard-pistol", "issf-25m-standard-pistol", "nr-50m-free-pistol", "issf-50m-free-pistol"])("%s public results and category workbook", (eventId) => {
    it("publishes the integer total and ranks regular and para results independently", async () => {
        const regular = shooter(eventId, "B-01")
        db.registrations.mockResolvedValue([regular, shooter(eventId, "B-01", true)])
        const response = await results(new NextRequest("http://localhost/api/competitions/super-cup-2026/results"))
        expect(response.status).toBe(200)
        const body = await response.json()
        const format = getScoringFormat(getRuleSet(regular.entries[0]), regular.entries[0])
        for (const category of [...body.categories, ...body.paraCategories]) {
            expect(category.rows[0]).toMatchObject({ rank: 1, scored: true, innerTenCount: 0, displayTotal: `${regular.entries[0].totalScore} / ${format.maxTotalScore}` })
            expect(category.rows[0].seriesScores).toEqual(regular.entries[0].seriesScores)
        }
        expect(body.topStudents.every((group: { rows: unknown[] }) => group.rows.length === 0)).toBe(true)
    })

    it("exports every series, stage subtotals, maximums, and no 10x column", async () => {
        const regular = shooter(eventId, "B-01")
        db.registrations.mockResolvedValue([regular])
        const response = await categoryExport(new NextRequest("http://localhost/api/admin/competitions/super-cup-2026/results/export"))
        expect(response.status).toBe(200)
        const workbook = XLSX.read(await response.arrayBuffer(), { type: "array" })
        const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(workbook.Sheets["B-01"])
        const format = getScoringFormat(getRuleSet(regular.entries[0]), regular.entries[0])
        const row = rows[0]
        expect(row[`Total Score /${format.maxTotalScore}`]).toBe(String(regular.entries[0].totalScore))
        expect(row).not.toHaveProperty("Total 10x")
        if (format.stages.length) {
            for (const stage of format.stages) {
                const scores = regular.entries[0].seriesScores.slice(stage.startIndex, stage.startIndex + stage.seriesCount)
                scores.forEach((score, index) => expect(row[`${stage.label} ${index + 1} /50`]).toBe(score))
                expect(row[`${stage.label} Total /${stage.maxScore}`]).toBe(scores.reduce((a, b) => a + b, 0))
            }
        } else {
            regular.entries[0].seriesScores.forEach((score, index) => expect(row[`Series ${index + 1} /100`]).toBe(String(score)))
            expect(row).not.toHaveProperty(`Series ${format.seriesCount + 1} /100`)
        }
    })
})

it("exports mixed registrations without truncating 12-series scores or changing air event scores", async () => {
    const staged = shooter("issf-25m-sports-pistol", "B-01")
    const free = shooter("nr-50m-free-pistol", "B-31")
    const air = shooter("issf-air-pistol", "S-01")
    const standard = shooter("issf-25m-standard-pistol", "B-09")
    db.registrations.mockResolvedValue([staged, free, air, standard])
    const response = await registrationExport(new NextRequest("http://localhost/api/admin/competitions/super-cup-2026/export"))
    expect(response.status).toBe(200)
    const workbook = XLSX.read(await response.arrayBuffer(), { type: "array" })
    const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(workbook.Sheets.Registrations)
    expect(rows[0]["Series 12"]).toBe("39")
    expect(rows[0]["Precision Total"]).toBe(285)
    expect(rows[0]["Duelling Total"]).toBe(249)
    expect(rows[0]["Precision Maximum"]).toBe(300)
    expect(rows[0]["Duelling Maximum"]).toBe(300)
    expect(rows[0]["10x"]).toBe("")
    expect(rows[1]["Series 4"]).toBe("")
    expect(rows[1]["Precision Total"]).toBe("")
    expect(rows[2]["Series 1"]).toBe("109.0")
    expect(rows[2]["10x"]).toBe(20)
    expect(rows[3]["Series 12"]).toBe("39")
    expect(rows[3]["150 sec Total"]).toBe(194)
    expect(rows[3]["20 sec Total"]).toBe(178)
    expect(rows[3]["10 sec Total"]).toBe(162)
    expect(rows[3]["150 sec Maximum"]).toBe(200)
    expect(rows[3]["20 sec Maximum"]).toBe(200)
    expect(rows[3]["10 sec Maximum"]).toBe(200)
    expect(rows[3]["Precision Total"]).toBe("")
    expect(rows[3]["10x"]).toBe("")
    expect(rows[0]["150 sec Total"]).toBe("")
})

it("keeps incompatible saved scores pending and out of published totals", async () => {
    const legacy = shooter("issf-25m-sports-pistol", "B-01")
    legacy.entries[0].seriesScores = [100, 100, 100, 100, 100, 100]
    legacy.entries[0].totalScore = 600
    db.registrations.mockResolvedValue([legacy])
    const response = await results(new NextRequest("http://localhost/api/results"))
    const body = await response.json()
    expect(body.categories[0].rows[0]).toMatchObject({ scored: false, rank: null, displayTotal: "-" })
    const exported = await categoryExport(new NextRequest("http://localhost/api/admin/results/export"))
    const workbook = XLSX.read(await exported.arrayBuffer(), { type: "array" })
    const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(workbook.Sheets["B-01"])
    expect(rows[0]).toMatchObject({ Status: "Pending", "Total Score /600": "", "Precision 1 /50": "" })
})

it("publishes Little Champ scores out of 200 and exports just two series with 10x", async () => {
    const littleChamp = shooter("nr-air-pistol", "S-19")
    Object.assign(littleChamp.entries[0], { seriesScores: [95, 96], totalScore: 191, innerTenCount: 10 })
    db.registrations.mockResolvedValue([littleChamp])
    const published = await results(new NextRequest("http://localhost/api/results"))
    const body = await published.json()
    expect(body.categories[0].rows[0]).toMatchObject({ rank: 1, scored: true, displayTotal: "191 / 200", innerTenCount: 10, seriesScores: [95, 96] })
    expect(body.topStudents.every((group: { rows: unknown[] }) => group.rows.length === 0)).toBe(true)
    const exported = await categoryExport(new NextRequest("http://localhost/api/admin/results/export"))
    const workbook = XLSX.read(await exported.arrayBuffer(), { type: "array" })
    const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(workbook.Sheets["S-19"])
    expect(rows[0]).toMatchObject({ "Series 1 /100": "95", "Series 2 /100": "96", "Total Score /200": "191", "Total 10x": 10 })
    expect(rows[0]).not.toHaveProperty("Series 3 /100")
})

it.each([
    ["nr-25m-standard-pistol", "B-27", 100, [99, 95, 91]],
    ["issf-25m-standard-pistol", "B-09", 200, [194, 178, 162]],
] as const)("exports %s registration stage totals without Precision or Duelling columns", async (eventId, categoryCode, maximum, totals) => {
    db.registrations.mockResolvedValue([shooter(eventId, categoryCode)])
    const response = await registrationExport(new NextRequest("http://localhost/api/admin/export"))
    expect(response.status).toBe(200)
    const workbook = XLSX.read(await response.arrayBuffer(), { type: "array" })
    const row = XLSX.utils.sheet_to_json<Record<string, string | number>>(workbook.Sheets.Registrations)[0]
    for (const [index, label] of ["150 sec", "20 sec", "10 sec"].entries()) {
        expect(row[`${label} Total`]).toBe(totals[index])
        expect(row[`${label} Maximum`]).toBe(maximum)
    }
    expect(row).not.toHaveProperty("Precision Total")
    expect(row).not.toHaveProperty("Duelling Total")
    expect(row["10x"]).toBe("")
})

it("shares one ranking snapshot, caps TV groups, and checks publication before returning 304", async () => {
    const athletes = Array.from({ length: 12 }, (_, i) => ({
        ...shooter("nr-air-pistol", "S-11"), name: "Student " + i,
    }))
    db.registrations.mockResolvedValue(athletes)
    const url = "http://localhost/api/competitions/super-cup-2026/results"
    const full = await results(new NextRequest(url))
    const tv = await results(new NextRequest(url + "?view=tv"))
    const body = await tv.json()
    expect((await full.json()).topStudents[2].rows).toHaveLength(12)
    expect(body.topStudents[2].rows).toHaveLength(10)
    expect(body).not.toHaveProperty("categories")
    expect(tv.headers.get("etag")).not.toEqual(full.headers.get("etag"))
    const headers = { "If-None-Match": tv.headers.get("etag")! }
    expect((await results(new NextRequest(url + "?view=tv", { headers }))).status).toBe(304)
    expect(db.registrations).toHaveBeenCalledTimes(1)
    db.competition.mockResolvedValueOnce({ isPublished: false })
    expect((await results(new NextRequest(url + "?view=tv", { headers }))).status).toBe(404)
})
