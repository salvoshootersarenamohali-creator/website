import { NextRequest } from "next/server"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    const registrations = await prisma.registration.findMany({
        orderBy: { createdAt: "desc" },
        include: { entries: { orderBy: { createdAt: "asc" } } },
    })

    return Response.json({ registrations })
}
