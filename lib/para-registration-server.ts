import { Prisma } from "@prisma/client"
import { CompetitionConfig } from "@/lib/competition"
import { getParaPaymentTransition, priceRegistrationForParaStatus } from "@/lib/para-registration"
import { prisma } from "@/lib/prisma"

export async function setRegistrationParaStatus({
    competitionId,
    registrationId,
    config,
    isPara,
}: {
    competitionId: string
    registrationId: string
    config: CompetitionConfig
    isPara: boolean
}) {
    const existing = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: { entries: { orderBy: { createdAt: "asc" } } },
    })
    if (!existing || existing.competitionId !== competitionId) return null

    const pricing = priceRegistrationForParaStatus(existing.entries, config, isPara)
    const paymentTransition = getParaPaymentTransition(existing, pricing.automaticallySponsored)
    const registrationData: Prisma.RegistrationUpdateInput = { amount: pricing.amount }

    if (paymentTransition) {
        registrationData.paymentStatus = paymentTransition.paymentStatus
        registrationData.paymentConfirmedBy = paymentTransition.paymentConfirmedBy
        if ("paymentMode" in paymentTransition) registrationData.paymentMode = paymentTransition.paymentMode
        if ("utrNumber" in paymentTransition) registrationData.utrNumber = paymentTransition.utrNumber
        registrationData.paymentConfirmedAt = paymentTransition.confirmNow ? new Date() : null
    }

    return prisma.$transaction(async (tx) => {
        await Promise.all(pricing.entries.map((entry) => tx.registrationEntry.update({
            where: { id: entry.id },
            data: { isPara: entry.isPara, fee: entry.fee },
        })))

        return tx.registration.update({
            where: { id: registrationId },
            data: registrationData,
            include: {
                entries: { orderBy: { createdAt: "asc" } },
                documents: { orderBy: { position: "asc" } },
            },
        })
    })
}
