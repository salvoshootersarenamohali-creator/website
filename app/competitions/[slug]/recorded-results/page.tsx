import Link from "next/link"
import { notFound } from "next/navigation"
import { BharatCupFinalists } from "@/components/BharatCupFinalists"
import { BharatCupRecordedResults } from "@/components/BharatCupRecordedResults"
import { BHARAT_CUP_SLUG } from "@/lib/bharat-cup"
import { getBharatCupFinals } from "@/lib/bharat-cup-finals"
import { normalizeCompetitionConfig } from "@/lib/competition"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const metadata = { title: "Recorded Results | First Bharat Cup" }

export default async function RecordedResultsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    if (slug !== BHARAT_CUP_SLUG) notFound()
    const competition = await prisma.competition.findUnique({
        where: { slug },
        select: { id: true, title: true, isPublished: true, resultsPublished: true, config: true },
    })
    if (!competition?.isPublished || !competition.resultsPublished) notFound()
    const entries = await prisma.registrationEntry.findMany({
        where: {
            registration: { competitionId: competition.id },
            OR: [{ totalScore: { not: null } }, { bharatCupResult: { isNot: null } }],
        },
        select: {
            id: true, eventId: true, categoryCode: true, isPara: true, seriesScores: true, totalScore: true, innerTenCount: true,
            registration: { select: { name: true, academy: true, gender: true } },
            bharatCupResult: { select: { matchDate: true, sourceRow: true, reportedMatch: true, flaggedSeriesTwo: true } },
        },
    })
    const recorded = entries.flatMap((entry) => entry.bharatCupResult ? [{ entry, result: entry.bharatCupResult }] : [])
    if (!recorded.length) notFound()
    const finals = getBharatCupFinals(entries, normalizeCompetitionConfig(competition.config).events)
    recorded.sort((a, b) => a.result.matchDate.getTime() - b.result.matchDate.getTime() || a.result.sourceRow - b.result.sourceRow)
    const rows = recorded.map(({ result: { matchDate, reportedMatch, flaggedSeriesTwo }, entry }) => {
        const scores = Array.isArray(entry.seriesScores) ? entry.seriesScores : []
        return {
            id: entry.id, date: matchDate.toISOString().slice(0, 10), reportedMatch, categoryCode: entry.categoryCode,
            shooter: entry.registration.name, academy: entry.registration.academy, total: entry.totalScore, innerTens: entry.innerTenCount,
            scores: Array.from({ length: 6 }, (_, index) => typeof scores[index] === "number" ? scores[index] : null),
            seriesTwoUnderReview: flaggedSeriesTwo !== null && typeof scores[1] !== "number",
        }
    })

    return (
        <main className="min-h-screen bg-black px-4 py-12 text-white">
            <div className="container mx-auto">
                <nav aria-label="Competition" className="mb-8 flex gap-6 text-sm font-semibold text-[#E5C558]">
                    <Link className="hover:underline" href={`/competitions/${slug}`}>Competition details</Link>
                    <Link className="hover:underline" href={`/competitions/${slug}/results`}>Live Results</Link>
                </nav>
                <p className="font-bold text-[#E5C558]">{competition.title}</p>
                <h1 className="mb-6 mt-2 text-4xl font-black md:text-5xl">Recorded Results</h1>
                <BharatCupFinalists finals={finals} />
                <BharatCupRecordedResults rows={rows} />
            </div>
        </main>
    )
}
