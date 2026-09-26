import { describe, expect, it } from "vitest"
import {
    buildWhatsAppResultsPreview,
    buildWhatsAppTemplatePayload,
    formatWhatsAppResults,
    maskWhatsAppPhone,
    normalizeWhatsAppPhone,
    WhatsAppResultsConfig,
} from "@/lib/whatsapp-results"
import type { ParticipantEntry } from "@/lib/participants"

const config: WhatsAppResultsConfig = {
    accessToken: "secret",
    phoneNumberId: "123456",
    graphApiVersion: "v99.0",
    templateName: "competition_result_certificate",
    templateLanguage: "en",
}

const result: ParticipantEntry = {
    entryId: "entry-1",
    eventId: "issf-air-pistol",
    eventTitle: "ISSF Air Pistol",
    categoryCode: "S-01",
    categoryLabel: "Senior Men",
    isPara: false,
    rank: 2,
    positionLabel: "2nd",
    displayScore: "587.4",
    innerTenCount: 18,
    medal: "silver",
}

describe("WhatsApp result messages", () => {
    it("normalizes Indian and international phone numbers for Cloud API", () => {
        expect(normalizeWhatsAppPhone("98765 43210")).toBe("919876543210")
        expect(normalizeWhatsAppPhone("09876543210")).toBe("919876543210")
        expect(normalizeWhatsAppPhone("+44 7700 900123")).toBe("447700900123")
        expect(normalizeWhatsAppPhone("1234")).toBe("")
        expect(maskWhatsAppPhone("98765 43210")).toBe("••••••••3210")
    })

    it("formats every scored entry with its score and rank", () => {
        expect(formatWhatsAppResults([result, { ...result, entryId: "entry-2", categoryCode: "S-02", rank: 4, positionLabel: "4th", medal: null }]))
            .toBe("S-01 - Senior Men: Score 587.4, Rank 2nd\nS-02 - Senior Men: Score 587.4, Rank 4th")
    })

    it("maps approved template variables in the documented order", () => {
        const input = {
            phone: "9876543210",
            participantName: "Aman Singh",
            competitionTitle: "38th Salvo Cup",
            resultsText: formatWhatsAppResults([result]),
            certificateUrl: "https://example.com/certificate",
        }
        const payload = buildWhatsAppTemplatePayload(input, config)
        expect(payload.to).toBe("919876543210")
        expect(payload.template.name).toBe("competition_result_certificate")
        expect(payload.template.components[0].parameters.map((parameter) => parameter.text)).toEqual([
            "Aman Singh",
            "38th Salvo Cup",
            "S-01 - Senior Men: Score 587.4, Rank 2nd",
            "https://example.com/certificate",
        ])
        expect(buildWhatsAppResultsPreview(input)).toContain("Download your certificate: https://example.com/certificate")
    })
})
