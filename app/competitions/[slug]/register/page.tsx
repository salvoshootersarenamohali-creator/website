import { notFound } from "next/navigation"
import RegistrationForm from "@/components/RegistrationForm"
import { getCompetitionBySlugOrActive, getTemplatePublicCompetition, serializeCompetition } from "@/lib/competition-server"

export const dynamic = "force-dynamic"

export default async function RegisterPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const row = await getCompetitionBySlugOrActive(slug).catch(error => {
        if (process.env.NODE_ENV === "production") throw error
        return null
    })
    const template = getTemplatePublicCompetition()
    const competition = row?.isPublished ? serializeCompetition(row)
        : !row && process.env.NODE_ENV !== "production" && slug === template.slug ? template : null
    if (!competition) notFound()
    return <RegistrationForm key={competition.id} competition={competition} />
}
