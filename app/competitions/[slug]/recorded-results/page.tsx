import Link from "next/link"
import { notFound } from "next/navigation"
import { BHARAT_CUP_SLUG } from "@/lib/bharat-cup"
import { prisma } from "@/lib/prisma"
import { BharatCupRecordedResults } from "@/components/BharatCupRecordedResults"

export const dynamic = "force-dynamic"
export const metadata = { title: "Recorded Results | First Bharat Cup" }

export default async function RecordedResultsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    if (slug !== BHARAT_CUP_SLUG) notFound()
    const competition = await prisma.competition.findUnique({ where: { slug }, select: { id: true, title: true, isPublished: true, resultsPublished: true } })
    if (!competition?.isPublished || !competition.resultsPublished) notFound()
    const results = await prisma.bharatCupRecordedResult.findMany({
        where: { entry: { registration: { competitionId: competition.id } } },
        orderBy: [{ matchDate: "asc" }, { sourceRow: "asc" }],
        select: {
            matchDate: true, reportedMatch: true, flaggedSeriesTwo: true,
            entry: {
                select: {
                    id: true, categoryCode: true, seriesScores: true, totalScore: true, innerTenCount: true,
                    registration: { select: { name: true, academy: true } },
                },
            },
        },
    })
    if (!results.length) notFound()
    const rows = results.map(({ matchDate, reportedMatch, flaggedSeriesTwo, entry }) => {
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
                <BharatCupRecordedResults rows={rows} />
            </div>
        </main>
    )
}
