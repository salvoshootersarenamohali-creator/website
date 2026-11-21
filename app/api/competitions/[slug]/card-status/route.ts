import { webCompetitionKey } from "@/lib/bharat-cup"
import { prisma } from "@/lib/prisma"

// A registration receipt can refresh its print copy without exposing player details.
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
    const { slug } = await context.params
    const body = await request.json().catch(() => null)
    const keys = body?.cardKeys
    if (!Array.isArray(keys) || !keys.length || keys.length > 20 || !keys.every(key =>
        typeof key === "string" && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(key))) {
        return Response.json({ error: "Invalid card receipt." }, { status: 400 })
    }
    const cards = await prisma.registration.findMany({
        where: { cardKey: { in: keys }, competition: webCompetitionKey(slug) },
        select: { id: true, isService: true },
    })
    return Response.json({ cards }, { headers: { "Cache-Control": "no-store" } })
}
