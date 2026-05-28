import { NextRequest } from "next/server"
import { adminUnauthorized, isAdminRequest, isCoachName, isValidCoachCode } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

type RouteContext = {
    params: Promise<{ id: string }>
}

const allowedStatuses = new Set(["Paid", "Sponsored"])
const allowedPaymentModes = new Set(["cash", "upi"])

export async function PATCH(request: NextRequest, context: RouteContext) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    const { id } = await context.params
    const body = await request.json()
    const coachName = String(body.coachName ?? "").trim().toLowerCase()
    const coachCode = String(body.coachCode ?? "").trim()
    const requestedPaymentStatus = String(body.paymentStatus ?? "").trim()
    const paymentMode = String(body.paymentMode ?? "").trim()
    const utrNumber = String(body.utrNumber ?? "").trim()

    if (!allowedPaymentModes.has(paymentMode)) {
        return Response.json({ error: "Payment method must be cash or online." }, { status: 400 })
    }

    if (!allowedStatuses.has(requestedPaymentStatus)) {
        return Response.json({ error: "Payment status must be Paid or Sponsored." }, { status: 400 })
    }

    if (paymentMode === "upi" && !/^\d{12}$/.test(utrNumber)) {
        return Response.json({ error: "Online payments require a 12-digit UTR number." }, { status: 400 })
    }

    if (!isCoachName(coachName) || !isValidCoachCode(coachName, coachCode)) {
        return Response.json({ error: "Invalid coach name or code." }, { status: 403 })
    }

    const registration = await prisma.registration.findUnique({ where: { id } })
    if (!registration) return Response.json({ error: "Registration not found." }, { status: 404 })
    if (registration.paymentStatus !== "Pending") {
        return Response.json({ error: "Only pending payments can be updated." }, { status: 400 })
    }

    const updated = await prisma.registration.update({
        where: { id },
        data: {
            paymentMode,
            paymentStatus: paymentMode === "upi" ? "Paid" : requestedPaymentStatus,
            utrNumber: paymentMode === "upi" ? utrNumber : null,
            paymentConfirmedBy: coachName,
            paymentConfirmedAt: new Date(),
        },
        include: { entries: { orderBy: { createdAt: "asc" } } },
    })

    return Response.json({ registration: updated })
}
