import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, it, vi } from "vitest"
import RecordedResultsPage from "@/app/competitions/[slug]/recorded-results/page"
import { BHARAT_CUP_SLUG } from "@/lib/bharat-cup"
import { defaultCompetitionConfig } from "@/lib/competition"
import { prisma } from "@/lib/prisma"

vi.mock("@/lib/prisma", () => ({
    prisma: { competition: { findUnique: vi.fn() }, registrationEntry: { findMany: vi.fn() } },
}))

vi.mock("@/components/BharatCupRecordedResults", () => ({
    BharatCupRecordedResults: ({ rows }: { rows: { shooter: string }[] }) =>
        createElement("div", { id: "recorded-scores" }, rows.map(({ shooter }) => shooter).join(", ")),
}))

it("shows finalists above the archive and includes newly posted scores that have no workbook row", async () => {
    const competitionLookup = vi.mocked(prisma.competition.findUnique)
    const scoreLookup = vi.mocked(prisma.registrationEntry.findMany)
    competitionLookup.mockResolvedValue({
        id: "bharat-cup",
        slug: BHARAT_CUP_SLUG,
        title: "First Bharat Cup",
        isPublished: true,
        resultsPublished: true,
        config: defaultCompetitionConfig,
        shortTitle: "Bharat Cup",
        description: null,
        venue: null,
        startDate: new Date("2026-11-12"),
        endDate: new Date("2026-11-15"),
        competitionYear: 2026,
        status: "closed",
        registrationOpen: false,
        paymentQrPath: null,
        heroImagePath: null,
        adminPinDigest: null,
        createdAt: new Date("2026-11-01"),
        updatedAt: new Date("2026-11-15"),
    })
    const imported = {
        id: "a", eventId: "nr-air-pistol", categoryCode: "S-11", isPara: false,
        seriesScores: [90, 90, 90, 90], totalScore: 360, innerTenCount: 0,
        registrationId: "a-reg", eventTitle: "NR Air Pistol", discipline: "pistol", ruleSet: "NR",
        categoryLabel: "NR Air Pistol Senior Men", fee: 0, shotScores: null, seriesInnerTenCounts: null,
        createdAt: new Date("2026-11-12"), updatedAt: new Date("2026-11-12"),
        registration: { name: "Imported shooter", academy: "Academy", gender: "" },
        bharatCupResult: { matchDate: new Date("2026-11-12"), sourceRow: 3, reportedMatch: "S-11", flaggedSeriesTwo: null, didNotFinish: false },
    }
    const posted = {
        ...imported, id: "b", registrationId: "b-reg", totalScore: 380, seriesScores: [95, 95, 95, 95],
        registration: { ...imported.registration, name: "Newly posted shooter", gender: "male" }, bharatCupResult: null,
    }
    scoreLookup.mockResolvedValueOnce([imported]).mockResolvedValueOnce([imported, posted])
    const params = Promise.resolve({ slug: BHARAT_CUP_SLUG })
    const before = renderToStaticMarkup(await RecordedResultsPage({ params }))
    const after = renderToStaticMarkup(await RecordedResultsPage({ params }))

    expect(before).toContain("Imported shooter")
    expect(before).not.toContain("Newly posted shooter")
    const archiveStart = after.indexOf('id="recorded-scores"')
    expect(archiveStart).toBeGreaterThan(0)
    expect(after.slice(0, archiveStart)).toMatch(/NR Air Pistol COC Finals.*ISSF Air Pistol Finals.*NR Air Rifle COC Finals.*ISSF Air Rifle COC Finals/)
    expect(after.slice(0, archiveStart)).toMatch(/Newly posted shooter.*Imported shooter/)
    expect(after.slice(archiveStart)).toContain("Imported shooter")
    expect(after.slice(archiveStart)).not.toContain("Newly posted shooter")
})
