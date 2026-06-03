import { NextRequest } from "next/server"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const registrations = await prisma.registration.findMany({
            orderBy: { createdAt: "desc" },
            include: { entries: { orderBy: { createdAt: "asc" } } },
        })

        return Response.json({ registrations })
    } catch (error) {
        console.error("Unable to load admin registrations", error)
        return Response.json({ error: "Unable to load registrations. Check the database connection and migrations." }, { status: 500 })
    }
}
