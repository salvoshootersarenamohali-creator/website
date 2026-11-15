import { readFileSync } from "node:fs"
import { NextRequest } from "next/server"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import * as XLSX from "xlsx"
import { POST } from "@/app/api/admin/competitions/[slug]/recorded-results/route"
import { BHARAT_CUP_SLUG, UNRECORDED_PAYMENT } from "@/lib/bharat-cup"
import { bharatCupMatchDays, readBharatCupWorkbook } from "@/lib/bharat-cup-workbook"
import { defaultCompetitionConfig } from "@/lib/competition"
import { prisma } from "@/lib/prisma"
import { submitRegistration } from "@/lib/registration-submit"

function syntheticWorkbook(): ArrayBuffer {
    const workbook = XLSX.utils.book_new()
    for (const [day, { sheet, entries }] of bharatCupMatchDays.entries()) {
        const header = [null, "Shooter Name", "Academy Name", "Match no", "1", "2", "3", "4", "5", "6", "Total"]
        const rows = Array.from({ length: entries }, (_, index) => {
            const identity = [null, `Shooter ${day}-${index}`, "Academy", "S 41"]
            if (day === 1 && index === 118) return [...identity.slice(0, -1), "R03", 102.7, 1045, 104.9, 104.8, 103.9, 104, 624.3]
            if (index === 1) return [...identity, null, null, null, null, null, null, 0]
            return [...identity, 81, 91, null, null, null, null, 172, index === 2 ? "13x" : null]
        })
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([[], header, ...rows, [null, null, null, null, null, null, null, null, null, null, 0]]), sheet)
    }
    return XLSX.write(workbook, { type: "array", bookType: "xlsx" })
}

const workbook = (() => {
    if (!process.env.BHARAT_TEST_WORKBOOK) return syntheticWorkbook()
    const bytes = readFileSync(process.env.BHARAT_TEST_WORKBOOK)
    return Uint8Array.from(bytes).buffer
})()

it("reads three days, cached totals, partial rounds and the flagged score without interpreting the 1045 as a valid series", () => {
    const rows = readBharatCupWorkbook(workbook)
    expect(bharatCupMatchDays.map(({ date }) => rows.filter((row) => row.matchDate === date).length)).toEqual([125, 155, 156])
    expect(rows.find((row) => row.seriesScores.length === 2)?.totalScore).toBeTypeOf("number")
    expect(rows.find((row) => row.innerTenCount === 0)?.innerTenCount).toBe(0)
    expect(rows.find((row) => row.seriesScores.length === 0)?.totalScore).toBeNull()
    expect(rows.find((row) => row.flaggedSeriesTwo !== null)).toMatchObject({
        sourceRow: 121, totalScore: 624.3, seriesScores: [102.7, null, 104.9, 104.8, 103.9, 104], flaggedSeriesTwo: 1045,
    })
})

describe.skipIf(!process.env.TEST_DATABASE_URL)("Bharat Cup registration and import against an isolated database", () => {
    let competitionId: string
    const pin = "bharat-test-admin"
    const context = { params: Promise.resolve({ slug: BHARAT_CUP_SLUG }) }
    const rows = readBharatCupWorkbook(workbook)

    beforeAll(async () => {
        const dbUrl = process.env.TEST_DATABASE_URL!
        if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(dbUrl).hostname) || process.env.DATABASE_URL !== dbUrl) {
            throw new Error("Integration tests require matching localhost DATABASE_URL and TEST_DATABASE_URL.")
        }
        vi.stubEnv("ADMIN_PIN", pin)
        const competition = await prisma.competition.create({
            data: {
                slug: BHARAT_CUP_SLUG, title: "First Bharat Cup", shortTitle: "Bharat Cup",
                competitionYear: 2026, startDate: new Date("2026-11-12"), endDate: new Date("2026-11-15"),
                registrationOpen: true, isPublished: true,
                config: { ...defaultCompetitionConfig, competitionYear: 2026, requiredDocuments: [{ id: "legacy", label: "Legacy document" }] },
            },
        })
        competitionId = competition.id
    })

    afterAll(async () => {
        if (competitionId) {
            await prisma.registration.deleteMany({ where: { competitionId } })
            await prisma.competition.delete({ where: { id: competitionId } })
        }
        await prisma.$disconnect()
        vi.unstubAllEnvs()
    })

    async function registrationRequest(overrides: Record<string, string> = {}) {
        const form = new FormData()
        const fields = {
            name: "Online Shooter", academy: "Online Academy", coachName: "Online Coach", phone: "9876543210",
            dateOfBirth: "2010-01-01", gender: "male", entries: JSON.stringify([{ eventId: "issf-air-pistol", categoryCode: "S-07" }]),
            ...overrides,
        }
        for (const [key, value] of Object.entries(fields)) form.set(key, value)
        return submitRegistration(new NextRequest(`http://localhost/api/competitions/${BHARAT_CUP_SLUG}/registrations`, { method: "POST", body: form }), BHARAT_CUP_SLUG)
    }

    async function importRequest(adminPin: string, preview?: string) {
        const form = new FormData()
        form.set("workbook", new File([workbook], "RESULT.xlsx"))
        if (preview) form.set("preview", preview)
        return POST(new NextRequest(`http://localhost/api/admin/competitions/${BHARAT_CUP_SLUG}/recorded-results`, {
            method: "POST", headers: { "x-admin-pin": adminPin }, body: form,
        }), context)
    }

    it("accepts just the competitor-card details and rejects invalid dates and missing coach names", async () => {
        expect((await registrationRequest({ dateOfBirth: "2010-02-30" })).status).toBe(400)
        expect((await registrationRequest({ coachName: "" })).status).toBe(400)
        const response = await registrationRequest({ paymentStatus: "Paid", preferredDate: "2026-11-13" })
        const result = await response.json()
        expect(response.status, result.error).toBe(201)
        const saved = await prisma.registration.findUniqueOrThrow({ where: { id: result.registration.id } })
        expect(saved).toMatchObject({ coachName: "Online Coach", studentPhotoPath: null, preferredDate: null, paymentStatus: UNRECORDED_PAYMENT })
    })

    it("previews, reconciles matching rows, preserves original details, and safely retries", async () => {
        const row = rows[0]
        const old = await prisma.registration.create({
            data: {
                competitionId, name: row.name.toUpperCase(), academy: row.academy,
                phone: "9876543210", gender: "male", preferredSlot: "9:00 AM", dateOfBirth: new Date("2010-01-01"),
                paymentMode: "upi", paymentStatus: "Paid", amount: 1000,
                entries: { create: { eventId: "nr-air-pistol", eventTitle: "Air Pistol", discipline: "pistol", ruleSet: "NR", categoryCode: row.categoryCode, categoryLabel: "Pistol", fee: 1000 } },
            },
        })
        expect((await importRequest("incorrect")).status).toBe(401)
        const dryRun = await importRequest(pin)
        const plan = await dryRun.json()
        expect(dryRun.status, plan.error).toBe(200)
        expect(plan).toMatchObject({ total: 436, created: 435, updated: 1, skipped: 0 })
        expect(await prisma.bharatCupRecordedResult.count()).toBe(0)
        const response = await importRequest(pin, plan.preview)
        expect(response.status, JSON.stringify(await response.json())).toBe(200)
        expect(await prisma.bharatCupRecordedResult.count()).toBe(436)
        expect(await prisma.registration.findUniqueOrThrow({ where: { id: old.id }, include: { entries: true } })).toMatchObject({
            paymentStatus: "Paid", phone: "9876543210",
            entries: [{ totalScore: row.totalScore, seriesScores: row.seriesScores, innerTenCount: row.innerTenCount }],
        })
        const retry = await importRequest(pin, plan.preview)
        expect(await retry.json()).toMatchObject({ total: 436, created: 0, updated: 0, skipped: 436 })
        expect(await prisma.bharatCupRecordedResult.count()).toBe(436)
        expect(await prisma.competition.findUniqueOrThrow({ where: { id: competitionId } })).toMatchObject({ resultsPublished: true, registrationOpen: true })
    })
})
