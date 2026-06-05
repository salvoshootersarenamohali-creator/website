import { NextRequest } from "next/server"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

type RouteContext = {
    params: Promise<{ id: string }>
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const { id } = await context.params
        const registration = await prisma.registration.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                entries: {
                    select: { id: true },
                },
            },
        })

        if (!registration) return Response.json({ error: "Registration not found." }, { status: 404 })

        await prisma.registration.delete({ where: { id } })

        return Response.json({
            deletedRegistrationId: registration.id,
            deletedEntryIds: registration.entries.map((entry) => entry.id),
            deletedName: registration.name,
        })
    } catch (error) {
        console.error("Unable to delete registration", error)
        return Response.json({ error: "Unable to delete registration. Check the database connection and try again." }, { status: 500 })
    }
}
