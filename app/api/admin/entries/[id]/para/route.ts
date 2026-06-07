import { NextRequest } from "next/server"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

type RouteContext = {
    params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const { id } = await context.params
        const body = await request.json()
        const isPara = body.isPara === true

        const existing = await prisma.registrationEntry.findUnique({
            where: { id },
            select: { id: true },
        })
        if (!existing) return Response.json({ error: "Entry not found." }, { status: 404 })

        const entry = await prisma.registrationEntry.update({
            where: { id },
            data: { isPara },
        })

        return Response.json({ entry })
    } catch (error) {
        console.error("Unable to update para entry status", error)
        return Response.json({ error: "Unable to update para entry status. Check the database connection and try again." }, { status: 500 })
    }
}
