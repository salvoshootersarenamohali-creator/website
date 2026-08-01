import { PDFDocument } from "pdf-lib"
import { describe, expect, it } from "vitest"
import { certificateFileName, generateParticipantCertificate } from "@/lib/certificate-pdf"
import { DirectoryParticipant } from "@/lib/participants"

const participant: DirectoryParticipant = {
    registrationId: "participant-1",
    shooterName: "A Participant With A Deliberately Long Competition Name",
    academy: "Salvo Shooters Arena",
    medalCount: 2,
    bestMedal: "gold",
    certificateUrl: "/certificate",
    entries: [
        { entryId: "one", eventId: "pistol", eventTitle: "ISSF Air Pistol", categoryCode: "S-01", categoryLabel: "Sub Youth Men", isPara: false, rank: 1, positionLabel: "1st", medal: "gold" },
        { entryId: "two", eventId: "rifle", eventTitle: "NR Air Rifle", categoryCode: "R-12", categoryLabel: "Senior Women", isPara: false, rank: 2, positionLabel: "2nd", medal: "silver" },
        { entryId: "three", eventId: "para-pistol", eventTitle: "Para Air Pistol", categoryCode: "P-01", categoryLabel: "Open", isPara: true, rank: 5, positionLabel: "5th", medal: null },
    ],
}

describe("certificate PDF", () => {
    it("creates a valid one-page landscape PDF with stable metadata", async () => {
        const bytes = await generateParticipantCertificate({
            title: "37th Salvo Cup",
            shortTitle: "37th Salvo Cup",
            startDate: "2026-07-31T00:00:00.000Z",
            endDate: "2026-08-02T00:00:00.000Z",
            venue: "Salvo Shooters Arena, Mohali",
        }, participant)
        const pdf = await PDFDocument.load(bytes)
        const [page] = pdf.getPages()

        expect(pdf.getPageCount()).toBe(1)
        expect(page.getWidth()).toBeGreaterThan(page.getHeight())
        expect(pdf.getSubject()).toBe("Certificate of Achievement")
        expect(bytes.byteLength).toBeGreaterThan(10_000)
    })

    it("sanitizes certificate filenames", () => {
        expect(certificateFileName("Kamal Preet / Shooter", "37th Salvo Cup")).toBe("kamal-preet-shooter-37th-salvo-cup-certificate.pdf")
    })
})
