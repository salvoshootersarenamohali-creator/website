import { describe, expect, it } from "vitest"
import { readFileSync, mkdirSync, writeFileSync } from "node:fs"
import { PDFDocument } from "pdf-lib"
import * as XLSX from "xlsx"
import { normalizeCompetitionConfig } from "@/lib/competition"
import { buildBookedDetails } from "@/lib/booked-details"
import { generateDetailPdf } from "@/lib/detail-pdf"
import { generateDetailWorkbook } from "@/lib/detail-workbook"
import { generateParticipantCertificate } from "@/lib/certificate-pdf"
import type { DirectoryParticipant } from "@/lib/participants"

const sql = readFileSync("prisma/migrations/20261012010000_add_nehra_memorial/migration.sql", "utf8")
const config = normalizeCompetitionConfig(JSON.parse(sql.match(/'(\{[\s\S]*\})'::jsonb/)![1]))
const registrations = Array.from({ length: 13 }, (_,i) => ({ id: String(i), name: `Shooter ${i + 1} With A Longer Name`, academy: "Nehra Shooting Club Kaithal", paymentStatus: "Paid", entries: [{ categoryCode: "R-01", categoryLabel: "ISSF Air Rifle Senior Men" }, { categoryCode: "R-03", categoryLabel: "ISSF Air Rifle Junior Men" }], relayBooking: { date: "2026-11-01", relayId: "relay-1", pool: "standard", lane: i + 1 } }))
const details = buildBookedDetails(registrations, config, "2026-11-01")
const participant: DirectoryParticipant = { registrationId: "qa", shooterName: "A Participant With A Deliberately Long Name", academy: "Nehra Shooting Club", medalCount: 1, bestMedal: "gold", certificateUrl: "/certificate", entries: [{ entryId: "one", eventId: "issf-air-rifle", eventTitle: "ISSF Air Rifle", categoryCode: "R-01", categoryLabel: "Senior Men", isPara: false, rank: 1, positionLabel: "1st", medal: "gold" }] }
function qaFile(name: string, bytes: Uint8Array) {
    if (process.env.PDF_QA_OUTPUT) { mkdirSync(process.env.PDF_QA_OUTPUT, { recursive: true }); writeFileSync(`${process.env.PDF_QA_OUTPUT}/${name}`, bytes) }
}
describe("booked detail exports and custom certificates", () => {
    it("exports numeric capacities and exactly one row per booked shooter", () => {
        const bytes = generateDetailWorkbook("Nehra Memorial", "Kaithal", details, "2026-10-31T18:00:00Z")
        const workbook = XLSX.read(bytes, { type: "buffer" })
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets["Lane Details"])
        expect(rows.filter((row) => (row as { Shooter: string }).Shooter.startsWith("Shooter"))).toHaveLength(13)
        const summary = XLSX.utils.sheet_to_json<(string | number)[]>(workbook.Sheets["Relay Summary"], { header: 1 })
        expect(summary[4].slice(-3)).toEqual([13, 13, 0])
        expect(summary[5].slice(-3)).toEqual([3, 0, 3])
        qaFile("details.xlsx", bytes)
    })
    it("creates paginated PDF sheets for full and empty pools", async () => {
        const bytes = await generateDetailPdf("2nd Shri Baru Ram Nehra Memorial Shooting Championship 2026", "Nehra Shooting Club, Ambala Road, Kaithal", details, "2026-10-31T18:00:00Z")
        const pdf = await PDFDocument.load(bytes)
        expect(pdf.getPageCount()).toBeGreaterThanOrEqual(18)
        qaFile("details.pdf", bytes)
    })
    it.each([0,1,2,3])("renders %i custom signers and competition branding", async (count) => {
        const bytes = await generateParticipantCertificate({ title: "2nd Shri Baru Ram Nehra Memorial Shooting Championship 2026", shortTitle: "Nehra Memorial 2026", startDate: "2026-11-01", endDate: "2026-11-06", venue: "Nehra Shooting Club, Kaithal", config: { certificate: { issuerName: "NEHRA SHOOTING CLUB, KAITHAL", logoPath: count ? "/salvo-logo.png" : null, signers: Array.from({ length: count }, (_,i) => ({ id: String(i), name: `Organizing Official ${i + 1}`, designation: "Competition Director", imagePath: "/certificates/anjum-moudgil-signature.png" })) } } }, participant)
        const pdf = await PDFDocument.load(bytes)
        expect(pdf.getAuthor()).toBe("NEHRA SHOOTING CLUB, KAITHAL")
        expect(pdf.getPageCount()).toBe(1)
        qaFile(`certificate-${count}.pdf`, bytes)
    })
})
