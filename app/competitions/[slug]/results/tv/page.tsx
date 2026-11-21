import TvResults from "@/components/TvResults"

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    return <TvResults key={slug} competitionSlug={slug} />
}
