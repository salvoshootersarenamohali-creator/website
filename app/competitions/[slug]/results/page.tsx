import { notFound } from "next/navigation"
import PublicResults from "@/components/PublicResults"
import { getCompetitionBySlugOrActive, getTemplatePublicCompetition, serializeCompetition } from "@/lib/competition-server"

export const dynamic = "force-dynamic"

export default async function ResultsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const row = await getCompetitionBySlugOrActive(slug).catch(error => {
        if (process.env.NODE_ENV === "production") throw error
        return null
    })
    const template = getTemplatePublicCompetition()
    const competition = row?.isPublished ? serializeCompetition(row)
        : !row && process.env.NODE_ENV !== "production" && slug === template.slug ? template : null
    if (!competition) notFound()
    return <PublicResults key={competition.id} initialCompetition={competition} />
}
