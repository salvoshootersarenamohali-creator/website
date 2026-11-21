import { redirect, notFound } from "next/navigation"
import { getActiveCompetition, getTemplatePublicCompetition } from "@/lib/competition-server"

export const dynamic = "force-dynamic"

export default async function RegisterPage() {
    const competition = await getActiveCompetition().catch(error => {
        if (process.env.NODE_ENV === "production") throw error
        return getTemplatePublicCompetition()
    })
    if (!competition) notFound()
    redirect(`/competitions/${competition.slug}/register`)
}
