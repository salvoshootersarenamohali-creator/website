import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { NextRequest } from "next/server"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/cloudinary-upload", async () => {
    const actual = await vi.importActual<typeof import("@/lib/cloudinary-upload")>("@/lib/cloudinary-upload")
    return { ...actual, uploadImageToCloudinary: vi.fn(async () => "/salvo-logo.png"), uploadDocumentToCloudinary: vi.fn(async () => "/document.pdf") }
})
import { prisma } from "@/lib/prisma"
import { submitRegistration } from "@/lib/registration-submit"
import { PATCH, DELETE } from "@/app/api/admin/registrations/[id]/route"
import { normalizeCompetitionConfig } from "@/lib/competition"
import { assertBookingConfigurationChange, serializableTransaction } from "@/lib/relay-booking-server"
import { GET as getAvailability } from "@/app/api/competitions/[slug]/relays/route"
import { POST as exportDetails } from "@/app/api/admin/details/export/route"
import { PDFDocument } from "pdf-lib"
import * as XLSX from "xlsx"

const enabled = !!process.env.TEST_DATABASE_URL
const slug = `booking-test-${randomUUID()}`
const sql = readFileSync("prisma/migrations/20261012010000_add_nehra_memorial/migration.sql", "utf8")
const config = normalizeCompetitionConfig(JSON.parse(sql.match(/'(\{[\s\S]*\})'::jsonb/)![1]))
function student(index: number, special = false, relay = "relay-1") {
    return { name: `Student ${index}`, gender: "male", dateOfBirth: special ? "2016-01-01" : "2000-01-01", preferredDate: "2026-11-01", preferredSlot: relay,
        entries: [{ eventId: special ? "nr-air-rifle" : "issf-air-rifle", categoryCode: special ? "R-19" : "R-01" }] }
}
function request(students: ReturnType<typeof student>[], batch = false, key = randomUUID()) {
    const form = new FormData()
    const shared = { academy: "Test Academy", coachName: "Test Coach", phone: "9876543210", paymentMode: "upi", utrNumber: "123456789012" }
    Object.entries(shared).forEach(([k,v]) => form.append(k,v))
    form.append("paymentScreenshot", new File(["receipt"], "receipt.png", { type: "image/png" }))
    if (batch) {
        form.append("students", JSON.stringify(students)); form.append("submissionKey", key)
        students.forEach((_,i) => form.append(`student:${i}:studentPhoto`, new File(["photo"], "photo.png", { type: "image/png" })))
    } else {
        Object.entries(students[0]).forEach(([k,v]) => form.append(k, typeof v === "string" ? v : JSON.stringify(v)))
        form.append("studentPhoto", new File(["photo"], "photo.png", { type: "image/png" }))
    }
    return new NextRequest(`http://localhost/api/competitions/${slug}/${batch ? "registration-batches" : "registrations"}`, { method: "POST", body: form })
}

describe.skipIf(!enabled)("booking transactions against an isolated PostgreSQL database", () => {
    beforeAll(async () => {
        const url = new URL(process.env.TEST_DATABASE_URL!)
        if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) throw new Error("Integration tests require matching localhost DATABASE_URL and TEST_DATABASE_URL.")
        vi.stubEnv("ADMIN_PIN", "booking-test-admin")
        await prisma.competition.create({ data: { slug, title: "Booking Test", shortTitle: "Booking Test", venue: "Test Club", startDate: new Date("2026-11-01"), endDate: new Date("2026-11-06"), competitionYear: 2026, isPublished: true, registrationOpen: true, config } })
    })
    afterAll(async () => {
        const competition = await prisma.competition.findUnique({ where: { slug } })
        if (competition) {
            await prisma.registration.deleteMany({ where: { competitionId: competition.id } })
            await prisma.registrationBatch.deleteMany({ where: { competitionId: competition.id } })
            await prisma.competition.delete({ where: { id: competition.id } })
        }
        await prisma.$disconnect(); vi.unstubAllEnvs()
    })
    it("keeps the withdrawn event unpublished after migrations", async () => {
        const event = await prisma.competition.findUniqueOrThrow({ where: { slug: "nehra-memorial-2026" } })
        expect(event.isPublished).toBe(false)
        expect(event.registrationOpen).toBe(false)
        expect(event.resultsPublished).toBe(false)
        expect(event.status).toBe("closed")
        expect(normalizeCompetitionConfig(event.config).relayBooking.days).toHaveLength(5)
    })
    it("accepts exactly 13 concurrent standard submissions and frees a deleted lane", async () => {
        const responses = await Promise.all(Array.from({ length: 14 }, (_,i) => submitRegistration(request([student(i)]), slug)))
        expect(responses.filter((r) => r.status === 201)).toHaveLength(13)
        expect(responses.filter((r) => r.status === 409)).toHaveLength(1)
        const registrations = await prisma.registration.findMany({ where: { competition: { slug } }, include: { relayBooking: true } })
        expect(new Set(registrations.map((r) => r.relayBooking!.lane)).size).toBe(13)
        const first = registrations.find((r) => r.relayBooking!.lane === 1)!
        const response = await DELETE(new NextRequest(`http://localhost/api/admin/competitions/${slug}/registrations/${first.id}`, { method: "DELETE", headers: { "x-admin-pin": "booking-test-admin" } }), { params: Promise.resolve({ id: first.id }) })
        expect(response.status).toBe(200)
        const replacement = await submitRegistration(request([student(20)]), slug)
        expect(replacement.status).toBe(201)
        expect((await replacement.json()).registration.relayBooking.lane).toBe(1)
    }, 60000)
    it("rolls back every student in an oversubscribed special batch", async () => {
        for (let i=0;i<2;i++) expect((await submitRegistration(request([student(30+i,true)]), slug)).status).toBe(201)
        const response = await submitRegistration(request([student(40,true), student(41,true)], true), slug, true)
        expect(response.status).toBe(409)
        expect(await prisma.registration.count({ where: { competition: { slug }, name: { in: ["Student 40", "Student 41"] } } })).toBe(0)
        expect(await prisma.registrationBatch.count({ where: { competition: { slug } } })).toBe(0)
    }, 30000)
    it("shares batch payment, assigns separate lanes, and deduplicates retries", async () => {
        const students = [student(50,true,"relay-3"),student(51,true,"relay-3")]
        const key = randomUUID()
        const response = await submitRegistration(request(students,true,key),slug,true)
        expect(response.status).toBe(201)
        const payload = await response.json()
        expect(payload.batch.amount).toBe(2000)
        expect(payload.registrations.map((r: { utrNumber: string }) => r.utrNumber)).toEqual(["123456789012","123456789012"])
        expect(payload.registrations.map((r: { screenshotPath: string }) => r.screenshotPath)).toEqual([payload.batch.screenshotPath, payload.batch.screenshotPath])
        const retry = await submitRegistration(request(students,true,key),slug,true)
        expect(retry.status).toBe(200)
        expect((await retry.json()).batch.id).toBe(payload.batch.id)
        expect(await prisma.registration.count({ where: { batchId: payload.batch.id } })).toBe(2)
    }, 30000)
    it("rejects invalid batches without leaving students or reservations", async () => {
        const invalid = { ...student(70,true,"relay-5"), entries: [{ eventId: "invalid", categoryCode: "invalid" }] }
        const response = await submitRegistration(request([student(69,true,"relay-5"), invalid],true),slug,true)
        expect(response.status).toBe(400)
        expect(await prisma.registration.count({ where: { competition: { slug }, name: "Student 69" } })).toBe(0)
    })
    it("rejects an admin move into a full pool and preserves the old booking", async () => {
        const created = await submitRegistration(request([student(80,false,"relay-3")]),slug)
        const registration = (await created.json()).registration
        const response = await PATCH(new NextRequest(`http://localhost/api/admin/competitions/${slug}/registrations/${registration.id}`, { method: "PATCH", headers: { "x-admin-pin": "booking-test-admin", "Content-Type": "application/json" }, body: JSON.stringify({ ...registration, dateOfBirth: "2000-01-01", preferredDate: "2026-11-01", preferredSlot: "relay-1" }) }), { params: Promise.resolve({ id: registration.id }) })
        expect(response.status).toBe(409)
        expect((await prisma.registrationRelayBooking.findUniqueOrThrow({ where: { registrationId: registration.id } })).relayId).toBe("relay-3")
    }, 30000)
    it("books NR-only and mixed NR/ISSF entries with one reservation per shooter", async () => {
        const nr = { ...student(90,false,"relay-2"), entries: [{ eventId: "nr-air-rifle", categoryCode: "R-11" }] }
        const nrResponse = await submitRegistration(request([nr]),slug)
        expect(nrResponse.status).toBe(201)
        expect((await nrResponse.json()).registration.relayBooking.relayId).toBe("relay-2")
        const mixed = { ...student(91,false,"relay-5"), entries: [...student(91).entries, ...nr.entries] }
        const mixedResponse = await submitRegistration(request([mixed]),slug)
        expect(mixedResponse.status).toBe(201)
        const registration = (await mixedResponse.json()).registration
        expect(registration.entries).toHaveLength(2)
        expect(registration.amount).toBe(2200)
        expect(await prisma.registrationRelayBooking.count({ where: { registrationId: registration.id } })).toBe(1)
        const invalid = await submitRegistration(request([{ ...mixed, preferredSlot: "relay-2" }]),slug)
        expect(invalid.status).toBe(400)
    })
    it("returns only capacities and rejects a stale last-lane special submission", async () => {
        const availability = await getAvailability(new Request(`http://localhost/api/competitions/${slug}/relays`), { params: Promise.resolve({ slug }) })
        const payload = await availability.json()
        expect(payload.relays[0].special.remaining).toBe(1)
        expect(JSON.stringify(payload)).not.toContain("Student")
        const responses = await Promise.all([submitRegistration(request([student(100,true)]),slug), submitRegistration(request([student(101,true)]),slug)])
        expect(responses.map((r) => r.status).sort()).toEqual([201,409])
    }, 30000)
    it("enforces lane uniqueness in the database and protects booked configuration", async () => {
        const competition = await prisma.competition.findUniqueOrThrow({ where: { slug } })
        const booking = await prisma.registrationRelayBooking.findFirstOrThrow({ where: { competitionId: competition.id } })
        const other = await prisma.registration.findFirstOrThrow({ where: { competitionId: competition.id, id: { not: booking.registrationId } } })
        await expect(prisma.registrationRelayBooking.update({ where: { registrationId: other.id }, data: { date: booking.date, relayId: booking.relayId, pool: booking.pool, lane: booking.lane } })).rejects.toMatchObject({ code: "P2002" })
        await expect(serializableTransaction((tx) => assertBookingConfigurationChange(tx, competition.id, { ...config, relayBooking: { ...config.relayBooking, enabled: false } }))).rejects.toThrow("disabling")
        await expect(serializableTransaction((tx) => assertBookingConfigurationChange(tx, competition.id, { ...config, relayBooking: { ...config.relayBooking, standardCapacity: 1 } }))).rejects.toThrow("invalidate")
    })
    it("serves live PDF and Excel detail snapshots through the admin endpoint", async () => {
        for (const format of ["pdf", "xlsx"]) {
            const response = await exportDetails(new NextRequest(`http://localhost/api/admin/competitions/${slug}/details/export`, { method: "POST", headers: { "x-admin-pin": "booking-test-admin", "Content-Type": "application/json" }, body: JSON.stringify({ date: "2026-11-01", format }) }))
            expect(response.status).toBe(200)
            expect(response.headers.get("Cache-Control")).toBe("no-store")
            const bytes = new Uint8Array(await response.arrayBuffer())
            if (format === "pdf") expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThanOrEqual(18)
            else {
                const workbook = XLSX.read(bytes, { type: "array" })
                const rows = XLSX.utils.sheet_to_json<(string | number)[]>(workbook.Sheets["Relay Summary"], { header: 1 })
                expect(rows[4].slice(-3)).toEqual([13,13,0])
            }
        }
    })
})
