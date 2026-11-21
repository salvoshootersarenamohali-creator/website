import { NextRequest } from "next/server"
import { adminUnauthorized, isCompetitionAdminRequest } from "@/lib/admin"
import { webCompetitionKey } from "@/lib/bharat-cup"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: NextRequest, context: { params: Promise<{ slug: string; id: string }> }) {
    if (!(await isCompetitionAdminRequest(request))) return adminUnauthorized()
    const { slug, id } = await context.params
    const body = await request.json().catch(() => null)
    if (typeof body?.isService !== "boolean") return Response.json({ error: "Choose on or off for service status." }, { status: 400 })
    try {
        const updated = await prisma.registration.updateMany({
            where: { id, competition: webCompetitionKey(slug) },
            data: { isService: body.isService },
        })
        if (!updated.count) return Response.json({ error: "Registration not found." }, { status: 404 })
        return Response.json({ id, isService: body.isService })
    } catch (error) {
        console.error("Unable to update service status", error)
        return Response.json({ error: "Unable to save service status. Please try again." }, { status: 500 })
    }
}
